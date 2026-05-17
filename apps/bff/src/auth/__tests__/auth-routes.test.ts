import { beforeEach, describe, expect, it, vi } from 'vitest';
import request from 'supertest';
import express, { type Express } from 'express';
import jwt from 'jsonwebtoken';
import { authMiddleware } from '../auth';
import { authRouter } from '../routes';
import {
  createUserWithPassword,
  findUserByEmail,
  findUserById,
  reactivateUser,
  softDeleteUser,
  updateUserPassword,
  updateUserProfile
} from '../users';
import { hashPassword, verifyPassword } from '../credentials';
import { recordIssuedRefreshToken, revokeAllRefreshTokensForUser } from '../refresh-tokens';

vi.mock('../users', () => ({
  findUserByEmail: vi.fn(),
  findUserById: vi.fn(),
  createUserWithPassword: vi.fn(),
  updateUserProfile: vi.fn(),
  updateUserPassword: vi.fn(),
  softDeleteUser: vi.fn(),
  // Default to "row was already live" so the existing login tests
  // — which never simulate a soft-deleted account — keep passing.
  reactivateUser: vi.fn().mockResolvedValue(false),
  VALID_LEVELS: ['beginner', 'intermediate', 'advanced'] as const
}));

// Frozen account-creation timestamp so the JSON response asserts can
// match exactly. Real users get NOW() from the DB, but the tests mock
// the storage layer, so we just pick a deterministic moment.
const TEST_CREATED_AT = new Date('2026-01-15T12:00:00Z');

vi.mock('../refresh-tokens', async () => {
  const actual = await vi.importActual<typeof import('../refresh-tokens')>('../refresh-tokens');
  return {
    ...actual,
    recordIssuedRefreshToken: vi.fn().mockResolvedValue(undefined),
    revokeAllRefreshTokensForUser: vi.fn().mockResolvedValue(undefined)
  };
});

vi.mock('../credentials', async () => {
  const actual = await vi.importActual<typeof import('../credentials')>('../credentials');
  return {
    ...actual,
    hashPassword: vi.fn(actual.hashPassword),
    verifyPassword: vi.fn(actual.verifyPassword)
  };
});

vi.mock('../../telemetry', () => ({
  logger: { info: vi.fn(), error: vi.fn(), warn: vi.fn(), debug: vi.fn() }
}));

describe('POST /auth/signup and /auth/login', () => {
  let app: Express;

  beforeEach(() => {
    vi.clearAllMocks();
    process.env.JWT_SECRET = 'test-access-secret';
    process.env.REFRESH_TOKEN_SECRET = 'test-refresh-secret';
    process.env.MOCK_SESSION = 'false';
    process.env.NODE_ENV = 'test';

    app = express();
    app.use(express.json());
    app.use(authMiddleware);
    app.use(authRouter);
  });

  describe('POST /auth/signup', () => {
    it('creates a new user and returns access + refresh tokens', async () => {
      vi.mocked(findUserByEmail).mockResolvedValue(null);
      vi.mocked(createUserWithPassword).mockResolvedValue({
        id: 'user-1',
        email: 'a@b.com',
        displayName: 'Alice',
        passwordHash: 'hashed',
        createdAt: TEST_CREATED_AT,
        level: 'intermediate'
      });

      const res = await request(app).post('/auth/signup').send({
        email: 'a@b.com',
        password: 'long-enough-pw',
        displayName: 'Alice',
        level: 'intermediate'
      });

      expect(res.status).toBe(201);
      expect(res.body.user).toEqual({
        id: 'user-1',
        email: 'a@b.com',
        displayName: 'Alice',
        createdAt: TEST_CREATED_AT.toISOString(),
        level: 'intermediate'
      });
      expect(typeof res.body.accessToken).toBe('string');
      expect(typeof res.body.refreshToken).toBe('string');

      const decoded = jwt.verify(res.body.accessToken, 'test-access-secret');
      expect(decoded).toMatchObject({ sub: 'user-1', email: 'a@b.com' });
      expect(createUserWithPassword).toHaveBeenCalled();
    });

    it('rejects an existing email with 409', async () => {
      vi.mocked(findUserByEmail).mockResolvedValue({
        id: 'u',
        email: 'a@b.com',
        displayName: null,
        passwordHash: 'x',
        createdAt: TEST_CREATED_AT,
        level: null
      });

      const res = await request(app)
        .post('/auth/signup')
        .send({ email: 'a@b.com', password: 'long-enough-pw' });

      expect(res.status).toBe(409);
      expect(createUserWithPassword).not.toHaveBeenCalled();
    });

    it('rejects a short password with 400', async () => {
      const res = await request(app)
        .post('/auth/signup')
        .send({ email: 'a@b.com', password: 'short' });

      expect(res.status).toBe(400);
    });

    it('rejects a malformed email with 400', async () => {
      const res = await request(app)
        .post('/auth/signup')
        .send({ email: 'not-an-email', password: 'long-enough-pw' });

      expect(res.status).toBe(400);
    });
  });

  describe('POST /auth/login', () => {
    it('returns tokens on a correct password', async () => {
      const hash = await hashPassword('correct-horse-battery-staple');
      vi.mocked(findUserByEmail).mockResolvedValue({
        id: 'user-1',
        email: 'a@b.com',
        displayName: 'Alice',
        passwordHash: hash,
        createdAt: TEST_CREATED_AT,
        level: 'beginner'
      });

      const res = await request(app)
        .post('/auth/login')
        .send({ email: 'a@b.com', password: 'correct-horse-battery-staple' });

      expect(res.status).toBe(200);
      expect(res.body.user.id).toBe('user-1');
      expect(typeof res.body.accessToken).toBe('string');
    });

    it('returns 401 on a wrong password', async () => {
      const hash = await hashPassword('correct-horse-battery-staple');
      vi.mocked(findUserByEmail).mockResolvedValue({
        id: 'user-1',
        email: 'a@b.com',
        displayName: null,
        passwordHash: hash,
        createdAt: TEST_CREATED_AT,
        level: null
      });

      const res = await request(app)
        .post('/auth/login')
        .send({ email: 'a@b.com', password: 'wrong' });

      expect(res.status).toBe(401);
    });

    it('returns 401 when the user does not exist (no enumeration)', async () => {
      vi.mocked(findUserByEmail).mockResolvedValue(null);

      const res = await request(app)
        .post('/auth/login')
        .send({ email: 'missing@example.com', password: 'whatever' });

      expect(res.status).toBe(401);
    });

    it('returns 401 when the user has no password set (OAuth-only future)', async () => {
      vi.mocked(findUserByEmail).mockResolvedValue({
        id: 'user-1',
        email: 'a@b.com',
        displayName: null,
        passwordHash: null,
        createdAt: TEST_CREATED_AT,
        level: null
      });

      const res = await request(app)
        .post('/auth/login')
        .send({ email: 'a@b.com', password: 'whatever' });

      expect(res.status).toBe(401);
    });

    it('reactivates a soft-deleted account on a correct password (ADR-0024 §4)', async () => {
      const hash = await hashPassword('still-knows-the-password');
      vi.mocked(findUserByEmail).mockResolvedValue({
        id: 'user-9',
        email: 'comeback@example.com',
        displayName: 'Noor',
        passwordHash: hash,
        createdAt: TEST_CREATED_AT,
        level: 'intermediate'
      });
      vi.mocked(reactivateUser).mockResolvedValue(true);

      const res = await request(app)
        .post('/auth/login')
        .send({ email: 'comeback@example.com', password: 'still-knows-the-password' });

      expect(res.status).toBe(200);
      expect(res.body.reactivated).toBe(true);
      // `findUserByEmail` must be invoked with includeDeleted so the
      // soft-deleted row is found in the first place. The mocked
      // implementation does not enforce this, but we can assert the
      // call shape.
      expect(findUserByEmail).toHaveBeenCalledWith(
        'comeback@example.com',
        expect.objectContaining({ includeDeleted: true })
      );
      expect(reactivateUser).toHaveBeenCalledWith('user-9');
    });

    it('omits the reactivated flag on a normal sign-in', async () => {
      const hash = await hashPassword('normal-pw');
      vi.mocked(findUserByEmail).mockResolvedValue({
        id: 'user-10',
        email: 'live@example.com',
        displayName: null,
        passwordHash: hash,
        createdAt: TEST_CREATED_AT,
        level: null
      });
      // `clearAllMocks` does not reset implementations, so the earlier
      // test's mockResolvedValue(true) would carry over. Pin it back to
      // false to model "this row was already live."
      vi.mocked(reactivateUser).mockResolvedValue(false);

      const res = await request(app)
        .post('/auth/login')
        .send({ email: 'live@example.com', password: 'normal-pw' });

      expect(res.status).toBe(200);
      expect(res.body.reactivated).toBeUndefined();
    });
  });

  describe('issued tokens', () => {
    it('refresh token verifies under REFRESH_TOKEN_SECRET', async () => {
      vi.mocked(findUserByEmail).mockResolvedValue(null);
      vi.mocked(createUserWithPassword).mockResolvedValue({
        id: 'user-2',
        email: 'r@example.com',
        displayName: null,
        passwordHash: 'x',
        createdAt: TEST_CREATED_AT,
        level: null
      });

      const res = await request(app)
        .post('/auth/signup')
        .send({ email: 'r@example.com', password: 'long-enough-pw' });

      const decoded = jwt.verify(res.body.refreshToken, 'test-refresh-secret');
      expect(decoded).toMatchObject({ sub: 'user-2' });
    });

    it('persists the issued refresh token hash with the user id and expiry', async () => {
      vi.mocked(findUserByEmail).mockResolvedValue(null);
      vi.mocked(createUserWithPassword).mockResolvedValue({
        id: 'user-3',
        email: 'p@example.com',
        displayName: null,
        passwordHash: 'x',
        createdAt: TEST_CREATED_AT,
        level: null
      });
      const before = Date.now();

      const res = await request(app)
        .post('/auth/signup')
        .send({ email: 'p@example.com', password: 'long-enough-pw' });

      expect(recordIssuedRefreshToken).toHaveBeenCalledTimes(1);
      const call = vi.mocked(recordIssuedRefreshToken).mock.calls[0][0];
      expect(call.userId).toBe('user-3');
      expect(typeof call.tokenHash).toBe('string');
      // SHA-256 hex digest is 64 chars and is not the raw JWT.
      expect(call.tokenHash).toHaveLength(64);
      expect(call.tokenHash).not.toBe(res.body.refreshToken);
      // 30d ± 5s window from the moment we made the request.
      const thirtyDays = 30 * 24 * 60 * 60 * 1000;
      expect(call.expiresAt.getTime()).toBeGreaterThanOrEqual(before + thirtyDays - 5000);
      expect(call.expiresAt.getTime()).toBeLessThanOrEqual(Date.now() + thirtyDays + 5000);
    });

    it('persists a refresh token hash on /auth/login too', async () => {
      const hash = await hashPassword('correct-horse-battery-staple');
      vi.mocked(findUserByEmail).mockResolvedValue({
        id: 'user-4',
        email: 'l@example.com',
        displayName: null,
        passwordHash: hash,
        createdAt: TEST_CREATED_AT,
        level: null
      });

      await request(app)
        .post('/auth/login')
        .send({ email: 'l@example.com', password: 'correct-horse-battery-staple' });

      expect(recordIssuedRefreshToken).toHaveBeenCalledTimes(1);
      expect(vi.mocked(recordIssuedRefreshToken).mock.calls[0][0].userId).toBe('user-4');
    });
  });

  describe('GET /auth/me', () => {
    it('returns 401 without an access token', async () => {
      const res = await request(app).get('/auth/me');
      expect(res.status).toBe(401);
      expect(findUserById).not.toHaveBeenCalled();
    });

    it('returns the current user from the DB on every call', async () => {
      vi.mocked(findUserById).mockResolvedValue({
        id: 'user-5',
        email: 'me@example.com',
        displayName: 'Noor',
        passwordHash: 'h',
        createdAt: TEST_CREATED_AT,
        level: 'intermediate'
      });

      // Mint an access token the same way the production code path does
      // so the auth middleware accepts it.
      const token = jwt.sign({ sub: 'user-5', email: 'me@example.com' }, 'test-access-secret');

      const res = await request(app).get('/auth/me').set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.user).toEqual({
        id: 'user-5',
        email: 'me@example.com',
        displayName: 'Noor',
        createdAt: TEST_CREATED_AT.toISOString(),
        level: 'intermediate'
      });
      expect(findUserById).toHaveBeenCalledWith('user-5');
    });

    it('returns 404 when the JWT verifies but the row is gone', async () => {
      vi.mocked(findUserById).mockResolvedValue(null);
      const token = jwt.sign({ sub: 'ghost' }, 'test-access-secret');

      const res = await request(app).get('/auth/me').set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(404);
    });
  });

  describe('PATCH /auth/me', () => {
    const token = jwt.sign({ sub: 'user-6', email: 'edit@example.com' }, 'test-access-secret');

    it('returns 401 without an access token', async () => {
      const res = await request(app).patch('/auth/me').send({ displayName: 'New Name' });
      expect(res.status).toBe(401);
      expect(updateUserProfile).not.toHaveBeenCalled();
    });

    it('updates displayName and returns the fresh user shape', async () => {
      vi.mocked(updateUserProfile).mockResolvedValue({
        id: 'user-6',
        email: 'edit@example.com',
        displayName: 'New Name',
        passwordHash: 'h',
        createdAt: TEST_CREATED_AT,
        level: 'intermediate'
      });

      const res = await request(app)
        .patch('/auth/me')
        .set('Authorization', `Bearer ${token}`)
        .send({ displayName: 'New Name' });

      expect(res.status).toBe(200);
      expect(res.body.user).toEqual({
        id: 'user-6',
        email: 'edit@example.com',
        displayName: 'New Name',
        createdAt: TEST_CREATED_AT.toISOString(),
        level: 'intermediate'
      });
      expect(updateUserProfile).toHaveBeenCalledWith('user-6', { displayName: 'New Name' });
    });

    it('updates level only when displayName is omitted', async () => {
      vi.mocked(updateUserProfile).mockResolvedValue({
        id: 'user-6',
        email: 'edit@example.com',
        displayName: 'Existing',
        passwordHash: 'h',
        createdAt: TEST_CREATED_AT,
        level: 'advanced'
      });

      const res = await request(app)
        .patch('/auth/me')
        .set('Authorization', `Bearer ${token}`)
        .send({ level: 'advanced' });

      expect(res.status).toBe(200);
      expect(updateUserProfile).toHaveBeenCalledWith('user-6', { level: 'advanced' });
    });

    it('rejects an empty body with 400', async () => {
      const res = await request(app)
        .patch('/auth/me')
        .set('Authorization', `Bearer ${token}`)
        .send({});

      expect(res.status).toBe(400);
      expect(updateUserProfile).not.toHaveBeenCalled();
    });

    it('rejects an unknown level value with 400', async () => {
      const res = await request(app)
        .patch('/auth/me')
        .set('Authorization', `Bearer ${token}`)
        .send({ level: 'wizard' });

      expect(res.status).toBe(400);
      expect(updateUserProfile).not.toHaveBeenCalled();
    });

    it('returns 404 if the row vanished mid-edit', async () => {
      vi.mocked(updateUserProfile).mockResolvedValue(null);

      const res = await request(app)
        .patch('/auth/me')
        .set('Authorization', `Bearer ${token}`)
        .send({ displayName: 'Whoever' });

      expect(res.status).toBe(404);
    });
  });

  describe('POST /auth/me/password', () => {
    const token = jwt.sign({ sub: 'user-7' }, 'test-access-secret');

    it('returns 401 without an access token', async () => {
      const res = await request(app)
        .post('/auth/me/password')
        .send({ currentPassword: 'whatever', newPassword: 'new-strong-pw' });
      expect(res.status).toBe(401);
      expect(updateUserPassword).not.toHaveBeenCalled();
    });

    it('rotates the hash when the current password verifies', async () => {
      const currentHash = await hashPassword('correct-horse-battery-staple');
      vi.mocked(findUserById).mockResolvedValue({
        id: 'user-7',
        email: 'rotate@example.com',
        displayName: null,
        passwordHash: currentHash,
        createdAt: TEST_CREATED_AT,
        level: null
      });
      vi.mocked(updateUserPassword).mockResolvedValue(true);

      const res = await request(app)
        .post('/auth/me/password')
        .set('Authorization', `Bearer ${token}`)
        .send({
          currentPassword: 'correct-horse-battery-staple',
          newPassword: 'something-much-stronger'
        });

      expect(res.status).toBe(204);
      expect(updateUserPassword).toHaveBeenCalledTimes(1);
      const [userId, newHash] = vi.mocked(updateUserPassword).mock.calls[0];
      expect(userId).toBe('user-7');
      // We can't compare to a literal — the hash is salted — but it
      // must verify back against the plaintext we just sent.
      expect(await verifyPassword('something-much-stronger', newHash)).toBe(true);
    });

    it('returns 401 when the current password is wrong', async () => {
      const currentHash = await hashPassword('correct-horse-battery-staple');
      vi.mocked(findUserById).mockResolvedValue({
        id: 'user-7',
        email: 'rotate@example.com',
        displayName: null,
        passwordHash: currentHash,
        createdAt: TEST_CREATED_AT,
        level: null
      });

      const res = await request(app)
        .post('/auth/me/password')
        .set('Authorization', `Bearer ${token}`)
        .send({
          currentPassword: 'guessing',
          newPassword: 'something-much-stronger'
        });

      expect(res.status).toBe(401);
      expect(updateUserPassword).not.toHaveBeenCalled();
    });

    it('returns 401 when the user row has no password set', async () => {
      vi.mocked(findUserById).mockResolvedValue({
        id: 'user-7',
        email: 'oauth-only@example.com',
        displayName: null,
        passwordHash: null,
        createdAt: TEST_CREATED_AT,
        level: null
      });

      const res = await request(app)
        .post('/auth/me/password')
        .set('Authorization', `Bearer ${token}`)
        .send({ currentPassword: 'whatever', newPassword: 'something-much-stronger' });

      expect(res.status).toBe(401);
    });

    it('rejects a too-short new password with 400', async () => {
      const res = await request(app)
        .post('/auth/me/password')
        .set('Authorization', `Bearer ${token}`)
        .send({ currentPassword: 'whatever', newPassword: 'short' });

      expect(res.status).toBe(400);
      expect(findUserById).not.toHaveBeenCalled();
    });

    it('rejects an empty current password with 400', async () => {
      const res = await request(app)
        .post('/auth/me/password')
        .set('Authorization', `Bearer ${token}`)
        .send({ currentPassword: '', newPassword: 'something-much-stronger' });

      expect(res.status).toBe(400);
    });
  });

  describe('DELETE /auth/me', () => {
    const token = jwt.sign({ sub: 'user-8' }, 'test-access-secret');

    it('returns 401 without an access token', async () => {
      const res = await request(app).delete('/auth/me');
      expect(res.status).toBe(401);
      expect(softDeleteUser).not.toHaveBeenCalled();
      expect(revokeAllRefreshTokensForUser).not.toHaveBeenCalled();
    });

    it('soft-deletes the row and revokes every refresh token', async () => {
      vi.mocked(softDeleteUser).mockResolvedValue(true);

      const res = await request(app).delete('/auth/me').set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(204);
      expect(softDeleteUser).toHaveBeenCalledWith('user-8');
      expect(revokeAllRefreshTokensForUser).toHaveBeenCalledWith('user-8');
    });

    it('returns 404 if the row was already soft-deleted', async () => {
      vi.mocked(softDeleteUser).mockResolvedValue(false);

      const res = await request(app).delete('/auth/me').set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(404);
      // Don't double-revoke on an already-deleted account — the
      // earlier delete already revoked, and a second pass would
      // mask a logic error.
      expect(revokeAllRefreshTokensForUser).not.toHaveBeenCalled();
    });
  });
});

// Sanity check the credential helper itself, since many other tests rely
// on hashPassword + verifyPassword round-tripping correctly.
describe('credentials', () => {
  it('verifyPassword round-trips a hash', async () => {
    const hash = await hashPassword('s3cretP@ss');
    expect(await verifyPassword('s3cretP@ss', hash)).toBe(true);
    expect(await verifyPassword('wrong', hash)).toBe(false);
  });
});
