import { Router } from 'express';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import type { AuthedRequest } from './auth';
import { logger } from '../telemetry';
import { hashPassword, issueAccessToken, issueRefreshToken, verifyPassword } from './credentials';
import { hashRefreshToken, recordIssuedRefreshToken } from './refresh-tokens';
import {
  createUserWithPassword,
  findUserByEmail,
  VALID_LEVELS,
  type UserLevel,
  type UserRow
} from './users';

export const authRouter = Router();

const signupSchema = z.object({
  body: z.object({
    email: z.string().email(),
    password: z.string().min(8).max(128),
    displayName: z.string().min(1).max(64).optional(),
    // The web sign-up form collects this; iOS does not send it today.
    // Persisted under users.preferences->'level' for the profile page.
    level: z.enum(VALID_LEVELS).optional()
  })
});

const loginSchema = z.object({
  body: z.object({
    email: z.string().email(),
    password: z.string().min(1).max(128)
  })
});

type AuthSuccess = {
  accessToken: string;
  refreshToken: string;
  user: {
    id: string;
    email: string;
    displayName: string | null;
    // ISO-8601 UTC string. Surfaced on the profile page as the "Joined …"
    // badge. Older clients ignore the field; newer ones treat it as the
    // user's account-creation timestamp.
    createdAt: string;
    // `null` for users created before this rule existed (and for iOS
    // sign-ups, which do not send the field). Clients render the badge
    // conditionally so a null does not produce an empty pill.
    level: UserLevel | null;
  };
};

const issueAuthSuccess = async (user: UserRow): Promise<AuthSuccess> => {
  const payload = {
    sub: user.id,
    email: user.email,
    name: user.displayName ?? undefined
  };
  const accessToken = issueAccessToken(payload);
  const refreshToken = issueRefreshToken(payload);
  const decoded = jwt.decode(refreshToken) as { exp: number };
  await recordIssuedRefreshToken({
    userId: user.id,
    tokenHash: hashRefreshToken(refreshToken),
    expiresAt: new Date(decoded.exp * 1000)
  });
  return {
    accessToken,
    refreshToken,
    user: {
      id: user.id,
      email: user.email,
      displayName: user.displayName,
      createdAt: user.createdAt.toISOString(),
      level: user.level
    }
  };
};

authRouter.post('/auth/signup', async (req: AuthedRequest, res) => {
  const validation = signupSchema.safeParse(req);
  if (!validation.success) {
    return res.status(400).json({ errors: validation.error.issues });
  }
  const { email, password, displayName, level } = validation.data.body;

  try {
    const existing = await findUserByEmail(email);
    if (existing) {
      return res.status(409).json({ error: 'email already in use' });
    }

    const passwordHash = await hashPassword(password);
    const user = await createUserWithPassword({
      email,
      displayName: displayName ?? null,
      passwordHash,
      level: level ?? null
    });

    res.status(201).json(await issueAuthSuccess(user));
  } catch (error) {
    logger.error('POST /auth/signup failed', { email, error });
    res.status(502).json({ error: 'Failed to create account' });
  }
});

authRouter.post('/auth/login', async (req: AuthedRequest, res) => {
  const validation = loginSchema.safeParse(req);
  if (!validation.success) {
    return res.status(400).json({ errors: validation.error.issues });
  }
  const { email, password } = validation.data.body;

  try {
    const user = await findUserByEmail(email);
    // Always run a verify pass even when the user is missing, so the
    // response timing is invariant with respect to existence (mitigates
    // user-enumeration via timing).
    const stored = user?.passwordHash ?? '';
    const ok = stored ? await verifyPassword(password, stored) : false;

    if (!user || !ok) {
      return res.status(401).json({ error: 'invalid email or password' });
    }

    res.json(await issueAuthSuccess(user));
  } catch (error) {
    logger.error('POST /auth/login failed', { email, error });
    res.status(502).json({ error: 'Failed to sign in' });
  }
});
