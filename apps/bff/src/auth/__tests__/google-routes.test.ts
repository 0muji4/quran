import { beforeEach, describe, expect, it, vi } from 'vitest';
import request from 'supertest';
import express, { type Express } from 'express';
import jwt from 'jsonwebtoken';
import { authMiddleware } from '../auth';
import { authRouter } from '../routes';
import { exchangeGoogleCode, verifyGoogleIdToken } from '../google';
import { consumeNonce } from '../auth-nonces';
import {
  createUserFromOAuth,
  findUserByOAuthIdentity,
  linkOAuthIdentity
} from '../oauth-identities';
import { findUserByEmail, reactivateUser } from '../users';

vi.mock('../google', () => ({ exchangeGoogleCode: vi.fn(), verifyGoogleIdToken: vi.fn() }));

vi.mock('../auth-nonces', () => ({ consumeNonce: vi.fn(), issueNonce: vi.fn() }));

vi.mock('../oauth-identities', () => ({
  findUserByOAuthIdentity: vi.fn(),
  linkOAuthIdentity: vi.fn(),
  createUserFromOAuth: vi.fn()
}));

vi.mock('../users', () => ({
  findUserByEmail: vi.fn(),
  reactivateUser: vi.fn().mockResolvedValue(false),
  VALID_LEVELS: ['beginner', 'intermediate', 'advanced'] as const
}));

vi.mock('../refresh-tokens', async () => {
  const actual = await vi.importActual<typeof import('../refresh-tokens')>('../refresh-tokens');
  return { ...actual, recordIssuedRefreshToken: vi.fn().mockResolvedValue(undefined) };
});

vi.mock('../../telemetry', () => ({
  logger: { info: vi.fn(), error: vi.fn(), warn: vi.fn(), debug: vi.fn() }
}));

const CREATED_AT = new Date('2026-01-15T12:00:00Z');

const userRow = (over: Partial<Record<string, unknown>> = {}) => ({
  id: 'user-1',
  email: 'a@b.com',
  displayName: 'Alice',
  passwordHash: null,
  createdAt: CREATED_AT,
  level: null,
  deletedAt: null,
  ...over
});

const identity = (over: Partial<Record<string, unknown>> = {}) => ({
  subject: 'google-sub-1',
  email: 'a@b.com',
  emailVerified: true,
  name: 'Alice',
  nonce: null,
  ...over
});

describe('POST /auth/google', () => {
  let app: Express;

  beforeEach(() => {
    vi.clearAllMocks();
    process.env.JWT_SECRET = 'test-access-secret';
    process.env.REFRESH_TOKEN_SECRET = 'test-refresh-secret';
    process.env.MOCK_SESSION = 'false';
    process.env.NODE_ENV = 'test';
    vi.mocked(reactivateUser).mockResolvedValue(false);

    app = express();
    app.use(express.json());
    app.use(authMiddleware);
    app.use(authRouter);
  });

  it('rejects an invalid code with 401', async () => {
    vi.mocked(exchangeGoogleCode).mockResolvedValue(null);
    const res = await request(app).post('/auth/google').send({ code: 'bad' });
    expect(res.status).toBe(401);
    expect(findUserByOAuthIdentity).not.toHaveBeenCalled();
  });

  it('returns 503 when Google sign-in is not configured', async () => {
    vi.mocked(exchangeGoogleCode).mockRejectedValue(new Error('not configured'));
    const res = await request(app).post('/auth/google').send({ code: 'x' });
    expect(res.status).toBe(503);
  });

  it('logs in a returning Google user via the existing identity', async () => {
    vi.mocked(exchangeGoogleCode).mockResolvedValue(identity());
    vi.mocked(findUserByOAuthIdentity).mockResolvedValue(userRow());

    const res = await request(app).post('/auth/google').send({ code: 'x' });

    expect(res.status).toBe(200);
    expect(res.body.user).toMatchObject({ id: 'user-1', email: 'a@b.com' });
    expect(jwt.verify(res.body.accessToken, 'test-access-secret')).toMatchObject({ sub: 'user-1' });
    expect(findUserByEmail).not.toHaveBeenCalled();
  });

  it('creates a new account when no identity and no email match', async () => {
    vi.mocked(exchangeGoogleCode).mockResolvedValue(identity());
    vi.mocked(findUserByOAuthIdentity).mockResolvedValue(null);
    vi.mocked(findUserByEmail).mockResolvedValue(null);
    vi.mocked(createUserFromOAuth).mockResolvedValue(userRow({ id: 'new-1' }));

    const res = await request(app).post('/auth/google').send({ code: 'x' });

    expect(res.status).toBe(201);
    expect(createUserFromOAuth).toHaveBeenCalled();
    expect(res.body.user.id).toBe('new-1');
  });

  it('auto-links a verified email to an existing account', async () => {
    vi.mocked(exchangeGoogleCode).mockResolvedValue(identity({ emailVerified: true }));
    vi.mocked(findUserByOAuthIdentity).mockResolvedValue(null);
    vi.mocked(findUserByEmail).mockResolvedValue(userRow({ id: 'existing-1' }));
    vi.mocked(linkOAuthIdentity).mockResolvedValue(undefined);

    const res = await request(app).post('/auth/google').send({ code: 'x' });

    expect(res.status).toBe(200);
    expect(linkOAuthIdentity).toHaveBeenCalledWith(
      expect.objectContaining({ userId: 'existing-1', provider: 'google', subject: 'google-sub-1' })
    );
    expect(res.body.user.id).toBe('existing-1');
  });

  it('requires password re-auth (409) when the email is unverified', async () => {
    vi.mocked(exchangeGoogleCode).mockResolvedValue(identity({ emailVerified: false }));
    vi.mocked(findUserByOAuthIdentity).mockResolvedValue(null);
    vi.mocked(findUserByEmail).mockResolvedValue(userRow({ id: 'existing-1' }));

    const res = await request(app).post('/auth/google').send({ code: 'x' });

    expect(res.status).toBe(409);
    expect(res.body).toMatchObject({ error: 'link_required', provider: 'google' });
    expect(linkOAuthIdentity).not.toHaveBeenCalled();
  });

  it('rejects a request with neither code nor idToken (400)', async () => {
    const res = await request(app).post('/auth/google').send({});
    expect(res.status).toBe(400);
    expect(exchangeGoogleCode).not.toHaveBeenCalled();
    expect(verifyGoogleIdToken).not.toHaveBeenCalled();
  });

  it('rejects a request with both code and idToken (400)', async () => {
    const res = await request(app).post('/auth/google').send({ code: 'x', idToken: 'y' });
    expect(res.status).toBe(400);
  });

  describe('native idToken path', () => {
    it('logs in via a verified ID token after consuming the nonce', async () => {
      vi.mocked(verifyGoogleIdToken).mockResolvedValue(identity({ nonce: 'n1' }));
      vi.mocked(consumeNonce).mockResolvedValue(true);
      vi.mocked(findUserByOAuthIdentity).mockResolvedValue(userRow());

      const res = await request(app).post('/auth/google').send({ idToken: 'tok' });

      expect(res.status).toBe(200);
      expect(consumeNonce).toHaveBeenCalledWith('n1');
      expect(exchangeGoogleCode).not.toHaveBeenCalled();
      expect(res.body.user.id).toBe('user-1');
    });

    it('rejects when the nonce is missing from the token (401)', async () => {
      vi.mocked(verifyGoogleIdToken).mockResolvedValue(identity({ nonce: null }));

      const res = await request(app).post('/auth/google').send({ idToken: 'tok' });

      expect(res.status).toBe(401);
      expect(consumeNonce).not.toHaveBeenCalled();
      expect(findUserByOAuthIdentity).not.toHaveBeenCalled();
    });

    it('rejects a replayed/unknown nonce (401)', async () => {
      vi.mocked(verifyGoogleIdToken).mockResolvedValue(identity({ nonce: 'used' }));
      vi.mocked(consumeNonce).mockResolvedValue(false);

      const res = await request(app).post('/auth/google').send({ idToken: 'tok' });

      expect(res.status).toBe(401);
      expect(findUserByOAuthIdentity).not.toHaveBeenCalled();
    });

    it('rejects an invalid ID token (401)', async () => {
      vi.mocked(verifyGoogleIdToken).mockResolvedValue(null);

      const res = await request(app).post('/auth/google').send({ idToken: 'bad' });

      expect(res.status).toBe(401);
      expect(consumeNonce).not.toHaveBeenCalled();
    });
  });
});
