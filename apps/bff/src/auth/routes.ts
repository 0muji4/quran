import { Router } from 'express';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import { requireAuth, type AuthedRequest } from './auth';
import { logger } from '../telemetry';
import { hashPassword, issueAccessToken, issueRefreshToken, verifyPassword } from './credentials';
import {
  hashRefreshToken,
  recordIssuedRefreshToken,
  revokeAllRefreshTokensForUser
} from './refresh-tokens';
import {
  createUserWithPassword,
  findUserByEmail,
  findUserById,
  reactivateUser,
  softDeleteUser,
  updateUserPassword,
  updateUserProfile,
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
  // Optional ADR-0024 §4 signal: present and `true` only when this
  // sign-in resurrected a soft-deleted row. Clients use it to surface
  // a "Welcome back — your account has been restored" toast.
  reactivated?: boolean;
};

const issueAuthSuccess = async (
  user: UserRow,
  options?: { reactivated?: boolean }
): Promise<AuthSuccess> => {
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
    },
    ...(options?.reactivated ? { reactivated: true } : {})
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

const changePasswordSchema = z.object({
  body: z.object({
    // `currentPassword` is verified before we touch anything; its length
    // constraint matches the login path (1..128) rather than the
    // signup path's `min(8)` so legacy accounts created before the
    // 8-char rule can still rotate their password.
    currentPassword: z.string().min(1).max(128),
    newPassword: z.string().min(8).max(128)
  })
});

const patchMeSchema = z.object({
  body: z
    .object({
      // `min(1)` matches the sign-up schema; `max(64)` keeps it in
      // sync with the display_name column's practical limit. `null` is
      // not accepted here — clearing the display name is intentionally
      // not a supported edit (the avatar falls back to email otherwise).
      displayName: z.string().min(1).max(64).optional(),
      level: z.enum(VALID_LEVELS).optional()
    })
    .refine((body) => body.displayName !== undefined || body.level !== undefined, {
      message: 'at least one field must be present'
    })
});

/// Returns the current signed-in user. Reads from the DB on every
/// call so a fresh level / displayName from "Edit profile" lands
/// without forcing a re-sign-in. 401 if no valid access cookie is
/// presented; 404 if the JWT verifies but the row has been deleted
/// (rare race, but possible during account-deletion rollout).
authRouter.get('/auth/me', async (req: AuthedRequest, res) => {
  const session = requireAuth(req, res);
  if (!session) return;
  try {
    const user = await findUserById(session.id);
    if (!user) {
      return res.status(404).json({ error: 'user not found' });
    }
    res.json({
      user: {
        id: user.id,
        email: user.email,
        displayName: user.displayName,
        createdAt: user.createdAt.toISOString(),
        level: user.level
      }
    });
  } catch (error) {
    logger.error('GET /auth/me failed', { userId: session.id, error });
    res.status(502).json({ error: 'Failed to load user' });
  }
});

/// Edit profile flow on the web client. Today the only editable
/// fields are `displayName` and `level`; email / password change have
/// their own endpoints. `at-least-one-field` is enforced by zod so a
/// no-op PATCH returns 400 rather than silently spending a DB round
/// trip. The response shape mirrors GET /auth/me so the client can
/// reuse the same Profile component without conditional rendering.
authRouter.patch('/auth/me', async (req: AuthedRequest, res) => {
  const session = requireAuth(req, res);
  if (!session) return;
  const validation = patchMeSchema.safeParse(req);
  if (!validation.success) {
    return res.status(400).json({ errors: validation.error.issues });
  }
  const { displayName, level } = validation.data.body;
  try {
    const updated = await updateUserProfile(session.id, {
      ...(displayName !== undefined ? { displayName } : {}),
      ...(level !== undefined ? { level } : {})
    });
    if (!updated) {
      return res.status(404).json({ error: 'user not found' });
    }
    res.json({
      user: {
        id: updated.id,
        email: updated.email,
        displayName: updated.displayName,
        createdAt: updated.createdAt.toISOString(),
        level: updated.level
      }
    });
  } catch (error) {
    logger.error('PATCH /auth/me failed', { userId: session.id, error });
    res.status(502).json({ error: 'Failed to update profile' });
  }
});

/// Password change for a signed-in user. Verifies the current password
/// before rotating so a hijacked access cookie can't change the
/// password by itself (the attacker would still need the old one). The
/// `newPassword` length rule matches the sign-up zod schema so the two
/// stay in lockstep. Returns 401 on a wrong current password —
/// deliberately the same status as a failed sign-in to give the same
/// signal across both flows.
///
/// Refresh-token revocation for other devices is intentionally NOT
/// done here — that's a follow-up tracked in the password-change
/// brief — so a user can rotate without being booted off every
/// signed-in device.
authRouter.post('/auth/me/password', async (req: AuthedRequest, res) => {
  const session = requireAuth(req, res);
  if (!session) return;
  const validation = changePasswordSchema.safeParse(req);
  if (!validation.success) {
    return res.status(400).json({ errors: validation.error.issues });
  }
  const { currentPassword, newPassword } = validation.data.body;
  try {
    const user = await findUserById(session.id);
    if (!user || !user.passwordHash) {
      return res.status(401).json({ error: 'current password is incorrect' });
    }
    const ok = await verifyPassword(currentPassword, user.passwordHash);
    if (!ok) {
      return res.status(401).json({ error: 'current password is incorrect' });
    }
    const newHash = await hashPassword(newPassword);
    const updated = await updateUserPassword(session.id, newHash);
    if (!updated) {
      return res.status(404).json({ error: 'user not found' });
    }
    res.status(204).end();
  } catch (error) {
    logger.error('POST /auth/me/password failed', { userId: session.id, error });
    res.status(502).json({ error: 'Failed to update password' });
  }
});

/// Soft-deletes the signed-in user per ADR-0024. Sets `deleted_at`,
/// revokes every refresh token issued to the user, returns 204. The
/// HttpOnly auth cookies are cleared by the caller (Web Server
/// Action) — this BFF route runs over Authorization: Bearer and has
/// no cookie context of its own.
///
/// Idempotent in the sense that a second call on an already-deleted
/// row is a 404 (the read gating in PR-E3 hides it). A user inside
/// the 30-day grace window can recover by signing in (PR-E5).
authRouter.delete('/auth/me', async (req: AuthedRequest, res) => {
  const session = requireAuth(req, res);
  if (!session) return;
  try {
    const deleted = await softDeleteUser(session.id);
    if (!deleted) {
      return res.status(404).json({ error: 'user not found' });
    }
    // Revoke after the soft-delete so a race that re-issues a token
    // between the two queries still ends up revoked — the deleted
    // user can't sign back in with the now-stale refresh token; only
    // a fresh /auth/login (which reactivates) works.
    await revokeAllRefreshTokensForUser(session.id);
    res.status(204).end();
  } catch (error) {
    logger.error('DELETE /auth/me failed', { userId: session.id, error });
    res.status(502).json({ error: 'Failed to delete account' });
  }
});

authRouter.post('/auth/login', async (req: AuthedRequest, res) => {
  const validation = loginSchema.safeParse(req);
  if (!validation.success) {
    return res.status(400).json({ errors: validation.error.issues });
  }
  const { email, password } = validation.data.body;

  try {
    // `includeDeleted: true` so a soft-deleted account can sign in to
    // reactivate (ADR-0024 §4). Every other authenticated read still
    // hides the deleted row.
    const user = await findUserByEmail(email, { includeDeleted: true });
    // Always run a verify pass even when the user is missing, so the
    // response timing is invariant with respect to existence (mitigates
    // user-enumeration via timing).
    const stored = user?.passwordHash ?? '';
    const ok = stored ? await verifyPassword(password, stored) : false;

    if (!user || !ok) {
      return res.status(401).json({ error: 'invalid email or password' });
    }

    // The row was soft-deleted but the password still verifies and the
    // 30-day grace window has not been purged yet: resurrect.
    const wasReactivated = await reactivateUser(user.id);
    if (wasReactivated) {
      logger.info('login reactivated soft-deleted account', { userId: user.id });
    }

    res.json(await issueAuthSuccess(user, { reactivated: wasReactivated }));
  } catch (error) {
    logger.error('POST /auth/login failed', { email, error });
    res.status(502).json({ error: 'Failed to sign in' });
  }
});
