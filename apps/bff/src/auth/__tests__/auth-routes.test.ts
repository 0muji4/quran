import { beforeEach, describe, expect, it, vi } from 'vitest';
import request from 'supertest';
import express, { type Express } from 'express';
import jwt from 'jsonwebtoken';
import { authMiddleware } from '../auth';
import { authRouter } from '../routes';
import { createUserWithPassword, findUserByEmail } from '../users';
import { hashPassword, verifyPassword } from '../credentials';
import { recordIssuedRefreshToken } from '../refresh-tokens';

vi.mock('../users', () => ({
  findUserByEmail: vi.fn(),
  findUserById: vi.fn(),
  createUserWithPassword: vi.fn()
}));

vi.mock('../refresh-tokens', async () => {
  const actual = await vi.importActual<typeof import('../refresh-tokens')>('../refresh-tokens');
  return {
    ...actual,
    recordIssuedRefreshToken: vi.fn().mockResolvedValue(undefined)
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
        passwordHash: 'hashed'
      });

      const res = await request(app)
        .post('/auth/signup')
        .send({ email: 'a@b.com', password: 'long-enough-pw', displayName: 'Alice' });

      expect(res.status).toBe(201);
      expect(res.body.user).toEqual({
        id: 'user-1',
        email: 'a@b.com',
        displayName: 'Alice'
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
        passwordHash: 'x'
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
        passwordHash: hash
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
        passwordHash: hash
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
        passwordHash: null
      });

      const res = await request(app)
        .post('/auth/login')
        .send({ email: 'a@b.com', password: 'whatever' });

      expect(res.status).toBe(401);
    });
  });

  describe('issued tokens', () => {
    it('refresh token verifies under REFRESH_TOKEN_SECRET', async () => {
      vi.mocked(findUserByEmail).mockResolvedValue(null);
      vi.mocked(createUserWithPassword).mockResolvedValue({
        id: 'user-2',
        email: 'r@example.com',
        displayName: null,
        passwordHash: 'x'
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
        passwordHash: 'x'
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
        passwordHash: hash
      });

      await request(app)
        .post('/auth/login')
        .send({ email: 'l@example.com', password: 'correct-horse-battery-staple' });

      expect(recordIssuedRefreshToken).toHaveBeenCalledTimes(1);
      expect(vi.mocked(recordIssuedRefreshToken).mock.calls[0][0].userId).toBe('user-4');
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
