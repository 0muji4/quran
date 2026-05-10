import { Router } from 'express';
import { z } from 'zod';
import type { AuthedRequest } from './auth';
import { logger } from '../telemetry';
import { hashPassword, issueAccessToken, issueRefreshToken, verifyPassword } from './credentials';
import { createUserWithPassword, findUserByEmail } from './users';

export const authRouter = Router();

const signupSchema = z.object({
  body: z.object({
    email: z.string().email(),
    password: z.string().min(8).max(128),
    displayName: z.string().min(1).max(64).optional()
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
  user: { id: string; email: string; displayName: string | null };
};

const formatSuccess = (user: {
  id: string;
  email: string;
  displayName: string | null;
}): AuthSuccess => {
  const payload = {
    sub: user.id,
    email: user.email,
    name: user.displayName ?? undefined
  };
  return {
    accessToken: issueAccessToken(payload),
    refreshToken: issueRefreshToken(payload),
    user: {
      id: user.id,
      email: user.email,
      displayName: user.displayName
    }
  };
};

authRouter.post('/auth/signup', async (req: AuthedRequest, res) => {
  const validation = signupSchema.safeParse(req);
  if (!validation.success) {
    return res.status(400).json({ errors: validation.error.issues });
  }
  const { email, password, displayName } = validation.data.body;

  try {
    const existing = await findUserByEmail(email);
    if (existing) {
      return res.status(409).json({ error: 'email already in use' });
    }

    const passwordHash = await hashPassword(password);
    const user = await createUserWithPassword({
      email,
      displayName: displayName ?? null,
      passwordHash
    });

    res.status(201).json(formatSuccess(user));
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

    res.json(formatSuccess(user));
  } catch (error) {
    logger.error('POST /auth/login failed', { email, error });
    res.status(502).json({ error: 'Failed to sign in' });
  }
});
