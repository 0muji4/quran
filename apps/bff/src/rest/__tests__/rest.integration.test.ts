import { beforeEach, describe, expect, it, vi } from 'vitest';
import request from 'supertest';
import express, { type Express } from 'express';
import jwt from 'jsonwebtoken';
import { restRouter } from '../rest';
import { authMiddleware, MOCK_SESSION_USER_ID } from '../../auth';
import { expectZodPathError } from '../../__tests__/zodAssertions';

// Mock dependencies
vi.mock('../../jobs', () => ({
  createSignedUploadUrl: vi.fn(),
  createScoringJob: vi.fn(),
  getScoringJob: vi.fn()
}));

vi.mock('../../infra', () => ({
  deleteUserData: vi.fn()
}));

vi.mock('../../auth/refresh-tokens', async () => {
  const actual = await vi.importActual<typeof import('../../auth/refresh-tokens')>(
    '../../auth/refresh-tokens'
  );
  return {
    ...actual,
    findRefreshToken: vi.fn(),
    markRefreshTokenUsed: vi.fn().mockResolvedValue(undefined),
    revokeAllRefreshTokensForUser: vi.fn().mockResolvedValue(undefined),
    recordIssuedRefreshToken: vi.fn().mockResolvedValue(undefined)
  };
});

vi.mock('../../telemetry', () => ({
  telemetry: {
    meter: {
      createHistogram: vi.fn(() => ({
        record: vi.fn()
      }))
    }
  },
  logger: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn()
  },
  recordSessionCreated: vi.fn(),
  recordSessionCompleted: vi.fn()
}));

describe('REST API Integration', () => {
  let app: Express;

  beforeEach(() => {
    vi.clearAllMocks();

    // Create express app for testing
    app = express();
    app.use(express.json());
    app.use(authMiddleware);
    app.use(restRouter);

    // Enable mock session for all tests
    process.env.MOCK_SESSION = 'true';
    process.env.NODE_ENV = 'test';
  });

  describe('POST /signed-upload-url', () => {
    it('returns signed upload URL with valid payload', async () => {
      const { createSignedUploadUrl } = await import('../../jobs');
      const mockResponse = {
        sessionId: 'session-123',
        uploadKey: 'uploads/test.opus',
        url: 'https://example.com/upload',
        fields: { key: 'uploads/test.opus' },
        expiresAt: '2024-12-31T23:59:59.000Z'
      };
      vi.mocked(createSignedUploadUrl).mockResolvedValue(mockResponse);

      const response = await request(app).post('/signed-upload-url').send({
        filename: 'test.opus',
        contentType: 'audio/opus'
      });

      expect(response.status).toBe(200);
      expect(response.body).toEqual(mockResponse);
      expect(createSignedUploadUrl).toHaveBeenCalledWith({
        filename: 'test.opus',
        contentType: 'audio/opus',
        userId: MOCK_SESSION_USER_ID
      });
    });

    it('returns 400 when filename is missing', async () => {
      const response = await request(app).post('/signed-upload-url').send({
        contentType: 'audio/opus'
      });

      expect(response.status).toBe(400);
      expectZodPathError(response.body, ['body', 'filename']);
    });

    it('returns 400 when contentType is missing', async () => {
      const response = await request(app).post('/signed-upload-url').send({
        filename: 'test.opus'
      });

      expect(response.status).toBe(400);
      expectZodPathError(response.body, ['body', 'contentType']);
    });

    it('returns 502 when createSignedUploadUrl fails', async () => {
      const { createSignedUploadUrl } = await import('../../jobs');
      vi.mocked(createSignedUploadUrl).mockRejectedValue(new Error('MinIO error'));

      const response = await request(app).post('/signed-upload-url').send({
        filename: 'test.opus',
        contentType: 'audio/opus'
      });

      expect(response.status).toBe(502);
      expect(response.body).toEqual({
        error: 'Failed to create signed upload url'
      });
    });

    it('requires authentication', async () => {
      process.env.MOCK_SESSION = 'false';

      const response = await request(app).post('/signed-upload-url').send({
        filename: 'test.opus',
        contentType: 'audio/opus'
      });

      expect(response.status).toBe(401);
      expect(response.body).toEqual({
        error: 'authentication required'
      });

      process.env.MOCK_SESSION = 'true';
    });
  });

  describe('POST /scoring-jobs', () => {
    it('creates scoring job with valid payload', async () => {
      const { createScoringJob } = await import('../../jobs');
      const mockJob = {
        jobId: 'job-123',
        status: 'pending',
        createdAt: '2024-01-01T00:00:00.000Z',
        pronunciationFeedback: null
      };
      vi.mocked(createScoringJob).mockResolvedValue(mockJob);

      const response = await request(app).post('/scoring-jobs').send({
        uploadKey: 'uploads/test.opus',
        surahId: '1',
        ayahNumber: 1
      });

      expect(response.status).toBe(201);
      expect(response.body).toEqual(mockJob);
      expect(createScoringJob).toHaveBeenCalledWith({
        sessionId: null,
        uploadKey: 'uploads/test.opus',
        surahId: '1',
        ayahNumber: 1,
        userId: MOCK_SESSION_USER_ID
      });
    });

    it('uses sessionId from request body if provided', async () => {
      const { createScoringJob } = await import('../../jobs');
      const mockJob = {
        jobId: 'job-456',
        status: 'pending',
        createdAt: '2024-01-01T00:00:00.000Z',
        pronunciationFeedback: null
      };
      vi.mocked(createScoringJob).mockResolvedValue(mockJob);

      const response = await request(app).post('/scoring-jobs').send({
        sessionId: 'custom-session-id',
        uploadKey: 'uploads/test.opus',
        surahId: '1',
        ayahNumber: 1
      });

      expect(response.status).toBe(201);
      expect(createScoringJob).toHaveBeenCalledWith({
        sessionId: 'custom-session-id',
        uploadKey: 'uploads/test.opus',
        surahId: '1',
        ayahNumber: 1,
        userId: MOCK_SESSION_USER_ID
      });
    });

    it('returns 400 when uploadKey is missing', async () => {
      const response = await request(app).post('/scoring-jobs').send({
        surahId: '1',
        ayahNumber: 1
      });

      expect(response.status).toBe(400);
      expectZodPathError(response.body, ['body', 'uploadKey']);
    });

    it('returns 400 when surahId is missing', async () => {
      const response = await request(app).post('/scoring-jobs').send({
        uploadKey: 'uploads/test.opus',
        ayahNumber: 1
      });

      expect(response.status).toBe(400);
      expectZodPathError(response.body, ['body', 'surahId']);
    });

    it('returns 400 when ayahNumber is missing', async () => {
      const response = await request(app).post('/scoring-jobs').send({
        uploadKey: 'uploads/test.opus',
        surahId: '1'
      });

      expect(response.status).toBe(400);
      expectZodPathError(response.body, ['body', 'ayahNumber']);
    });

    it('returns 400 when ayahNumber is not a number', async () => {
      const response = await request(app).post('/scoring-jobs').send({
        uploadKey: 'uploads/test.opus',
        surahId: '1',
        ayahNumber: 'not-a-number'
      });

      expect(response.status).toBe(400);
      expectZodPathError(response.body, ['body', 'ayahNumber']);
    });

    it('returns 502 when createScoringJob fails', async () => {
      const { createScoringJob } = await import('../../jobs');
      vi.mocked(createScoringJob).mockRejectedValue(new Error('Backend error'));

      const response = await request(app).post('/scoring-jobs').send({
        uploadKey: 'uploads/test.opus',
        surahId: '1',
        ayahNumber: 1
      });

      expect(response.status).toBe(502);
      expect(response.body).toEqual({
        error: 'Failed to create scoring job'
      });
    });

    it('requires authentication', async () => {
      process.env.MOCK_SESSION = 'false';

      const response = await request(app).post('/scoring-jobs').send({
        uploadKey: 'uploads/test.opus',
        surahId: '1',
        ayahNumber: 1
      });

      expect(response.status).toBe(401);
      expect(response.body).toEqual({
        error: 'authentication required'
      });

      process.env.MOCK_SESSION = 'true';
    });
  });

  describe('GET /scoring-jobs/:jobId', () => {
    it('returns scoring job by jobId', async () => {
      const { getScoringJob } = await import('../../jobs');
      const mockJob = {
        jobId: 'job-789',
        status: 'completed',
        createdAt: '2024-01-01T00:00:00.000Z',
        pronunciationFeedback: {
          accuracy: 0.95,
          fluency: 0.9,
          completeness: 0.98,
          overall: 0.94,
          wordAlignments: [],
          wer: 0.05,
          referenceAudioUrl: null
        }
      };
      vi.mocked(getScoringJob).mockResolvedValue(mockJob);

      const response = await request(app).get('/scoring-jobs/job-789');

      expect(response.status).toBe(200);
      expect(response.body).toEqual(mockJob);
      expect(getScoringJob).toHaveBeenCalledWith('job-789');
    });

    it('returns 404 when job not found', async () => {
      const { getScoringJob } = await import('../../jobs');
      vi.mocked(getScoringJob).mockResolvedValue(null);

      const response = await request(app).get('/scoring-jobs/nonexistent');

      expect(response.status).toBe(404);
      expect(response.body).toEqual({
        error: 'Job not found'
      });
    });

    it('returns 502 when getScoringJob fails', async () => {
      const { getScoringJob } = await import('../../jobs');
      vi.mocked(getScoringJob).mockRejectedValue(new Error('Backend error'));

      const response = await request(app).get('/scoring-jobs/job-error');

      expect(response.status).toBe(502);
      expect(response.body).toEqual({
        error: 'Failed to fetch scoring job'
      });
    });

    it('requires authentication', async () => {
      process.env.MOCK_SESSION = 'false';

      const response = await request(app).get('/scoring-jobs/job-123');

      expect(response.status).toBe(401);
      expect(response.body).toEqual({
        error: 'authentication required'
      });

      process.env.MOCK_SESSION = 'true';
    });
  });

  describe('POST /auth/refresh', () => {
    const refreshSecret = 'refresh-secret';
    const accessSecret = 'jwt-secret';

    beforeEach(() => {
      process.env.REFRESH_TOKEN_SECRET = refreshSecret;
      process.env.JWT_SECRET = accessSecret;
    });

    const mintAndStub = async (
      userId: string,
      row: { usedAt?: Date | null; revokedAt?: Date | null } = {}
    ) => {
      const { findRefreshToken } = await import('../../auth/refresh-tokens');
      const token = jwt.sign({ sub: userId, email: 'a@b.com' }, refreshSecret, {
        expiresIn: '30d'
      });
      vi.mocked(findRefreshToken).mockResolvedValue({
        userId,
        expiresAt: new Date(Date.now() + 30 * 24 * 3600 * 1000),
        usedAt: row.usedAt ?? null,
        revokedAt: row.revokedAt ?? null
      });
      return token;
    };

    it('rotates: marks the old token used, returns a new access + refresh pair, persists the new hash', async () => {
      const token = await mintAndStub('user-123');
      const { markRefreshTokenUsed, recordIssuedRefreshToken } =
        await import('../../auth/refresh-tokens');

      const response = await request(app).post('/auth/refresh').send({ refreshToken: token });

      expect(response.status).toBe(200);
      expect(typeof response.body.accessToken).toBe('string');
      expect(typeof response.body.refreshToken).toBe('string');
      expect(response.body.refreshToken).not.toBe(token);

      const decodedAccess = jwt.verify(response.body.accessToken, accessSecret) as jwt.JwtPayload;
      expect(decodedAccess.sub).toBe('user-123');

      expect(markRefreshTokenUsed).toHaveBeenCalledTimes(1);
      expect(recordIssuedRefreshToken).toHaveBeenCalledTimes(1);
      const persisted = vi.mocked(recordIssuedRefreshToken).mock.calls[0][0];
      expect(persisted.userId).toBe('user-123');
      expect(persisted.tokenHash).toHaveLength(64);
    });

    it('on replay (same token used twice), revokes every refresh token for the user and returns 401', async () => {
      const token = await mintAndStub('user-123', { usedAt: new Date(Date.now() - 60_000) });
      const { revokeAllRefreshTokensForUser, recordIssuedRefreshToken, markRefreshTokenUsed } =
        await import('../../auth/refresh-tokens');

      const response = await request(app).post('/auth/refresh').send({ refreshToken: token });

      expect(response.status).toBe(401);
      expect(revokeAllRefreshTokensForUser).toHaveBeenCalledWith('user-123');
      expect(markRefreshTokenUsed).not.toHaveBeenCalled();
      expect(recordIssuedRefreshToken).not.toHaveBeenCalled();
    });

    it('returns 401 when the token verifies but is not in the database (never issued or pruned)', async () => {
      const { findRefreshToken, revokeAllRefreshTokensForUser } =
        await import('../../auth/refresh-tokens');
      vi.mocked(findRefreshToken).mockResolvedValue(null);

      const token = jwt.sign({ sub: 'user-x' }, refreshSecret, { expiresIn: '7d' });
      const response = await request(app).post('/auth/refresh').send({ refreshToken: token });

      expect(response.status).toBe(401);
      expect(revokeAllRefreshTokensForUser).not.toHaveBeenCalled();
    });

    it('returns 401 when the token has been revoked', async () => {
      const token = await mintAndStub('user-123', { revokedAt: new Date(Date.now() - 60_000) });
      const response = await request(app).post('/auth/refresh').send({ refreshToken: token });

      expect(response.status).toBe(401);
    });

    it('returns 400 when refreshToken is missing', async () => {
      const response = await request(app).post('/auth/refresh').send({});

      expect(response.status).toBe(400);
      expectZodPathError(response.body, ['body', 'refreshToken']);
    });

    it('returns 401 for an invalid refresh token (signature fails before DB lookup)', async () => {
      const { findRefreshToken } = await import('../../auth/refresh-tokens');
      const response = await request(app)
        .post('/auth/refresh')
        .send({ refreshToken: 'invalid.token.here' });

      expect(response.status).toBe(401);
      expect(findRefreshToken).not.toHaveBeenCalled();
    });

    it('returns 401 for an expired refresh token', async () => {
      const expiredToken = jwt.sign(
        { sub: 'user-expired', exp: Math.floor(Date.now() / 1000) - 3600 },
        refreshSecret
      );

      const response = await request(app)
        .post('/auth/refresh')
        .send({ refreshToken: expiredToken });

      expect(response.status).toBe(401);
    });
  });

  describe('DELETE /user-data/:sessionId', () => {
    it('deletes user data successfully', async () => {
      const { deleteUserData } = await import('../../infra');
      vi.mocked(deleteUserData).mockResolvedValue({
        audioKey: 'uploads/test.opus',
        alignmentKey: 'alignments/test.json'
      });

      const response = await request(app).delete('/user-data/session-123');

      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        status: 'deleted',
        sessionId: 'session-123'
      });
      expect(deleteUserData).toHaveBeenCalledWith({
        sessionId: 'session-123',
        userId: MOCK_SESSION_USER_ID
      });
    });

    it('returns 404 when user data not found', async () => {
      const { deleteUserData } = await import('../../infra');
      vi.mocked(deleteUserData).mockResolvedValue(null);

      const response = await request(app).delete('/user-data/nonexistent');

      expect(response.status).toBe(404);
      expect(response.body).toEqual({
        error: 'user data not found'
      });
    });

    it('returns 400 when sessionId is missing', async () => {
      const response = await request(app).delete('/user-data/');

      expect(response.status).toBe(404); // Express returns 404 for no route match
    });

    it('requires authentication', async () => {
      process.env.MOCK_SESSION = 'false';

      const response = await request(app).delete('/user-data/session-123');

      expect(response.status).toBe(401);
      expect(response.body).toEqual({
        error: 'authentication required'
      });

      process.env.MOCK_SESSION = 'true';
    });
  });
});
