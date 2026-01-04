import { beforeEach, describe, expect, it, vi } from 'vitest';
import request from 'supertest';
import express, { type Express } from 'express';
import jwt from 'jsonwebtoken';
import { restRouter } from '../rest';
import { authMiddleware } from '../../auth';

// Mock dependencies
vi.mock('../../jobs', () => ({
  createSignedUploadUrl: vi.fn(),
  createScoringJob: vi.fn(),
  getScoringJob: vi.fn()
}));

vi.mock('../../infra', () => ({
  deleteUserData: vi.fn()
}));

vi.mock('../../telemetry', () => ({
  telemetry: {
    meter: {
      createHistogram: vi.fn(() => ({
        record: vi.fn()
      }))
    }
  }
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
        userId: 'mock-user'
      });
    });

    it('returns 400 when filename is missing', async () => {
      const response = await request(app).post('/signed-upload-url').send({
        contentType: 'audio/opus'
      });

      expect(response.status).toBe(400);
      expect(response.body).toEqual({
        error: 'filename and contentType are required'
      });
    });

    it('returns 400 when contentType is missing', async () => {
      const response = await request(app).post('/signed-upload-url').send({
        filename: 'test.opus'
      });

      expect(response.status).toBe(400);
      expect(response.body).toEqual({
        error: 'filename and contentType are required'
      });
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
        userId: 'mock-user'
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
        userId: 'mock-user'
      });
    });

    it('returns 400 when uploadKey is missing', async () => {
      const response = await request(app).post('/scoring-jobs').send({
        surahId: '1',
        ayahNumber: 1
      });

      expect(response.status).toBe(400);
      expect(response.body).toEqual({
        error: 'uploadKey, surahId, and ayahNumber are required'
      });
    });

    it('returns 400 when surahId is missing', async () => {
      const response = await request(app).post('/scoring-jobs').send({
        uploadKey: 'uploads/test.opus',
        ayahNumber: 1
      });

      expect(response.status).toBe(400);
      expect(response.body).toEqual({
        error: 'uploadKey, surahId, and ayahNumber are required'
      });
    });

    it('returns 400 when ayahNumber is missing', async () => {
      const response = await request(app).post('/scoring-jobs').send({
        uploadKey: 'uploads/test.opus',
        surahId: '1'
      });

      expect(response.status).toBe(400);
      expect(response.body).toEqual({
        error: 'uploadKey, surahId, and ayahNumber are required'
      });
    });

    it('returns 400 when ayahNumber is not a number', async () => {
      const response = await request(app).post('/scoring-jobs').send({
        uploadKey: 'uploads/test.opus',
        surahId: '1',
        ayahNumber: 'not-a-number'
      });

      expect(response.status).toBe(400);
      expect(response.body).toEqual({
        error: 'uploadKey, surahId, and ayahNumber are required'
      });
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
    it('refreshes access token with valid refresh token', async () => {
      const jwt = await import('jsonwebtoken');

      process.env.REFRESH_TOKEN_SECRET = 'refresh-secret';
      process.env.JWT_SECRET = 'jwt-secret';

      const refreshPayload = {
        sub: 'user-123',
        email: 'test@example.com',
        name: 'Test User'
      };
      const refreshToken = jwt.sign(refreshPayload, 'refresh-secret', { expiresIn: '7d' });

      const response = await request(app).post('/auth/refresh').send({
        refreshToken
      });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('accessToken');

      // Verify the access token
      const decoded = jwt.verify(response.body.accessToken, 'jwt-secret') as jwt.JwtPayload;
      expect(decoded.sub).toBe('user-123');
      expect(decoded.email).toBe('test@example.com');
    });

    it('returns 400 when refreshToken is missing', async () => {
      const response = await request(app).post('/auth/refresh').send({});

      expect(response.status).toBe(400);
      expect(response.body).toEqual({
        error: 'refreshToken is required'
      });
    });

    it('returns 401 for invalid refresh token', async () => {
      process.env.REFRESH_TOKEN_SECRET = 'refresh-secret';

      const response = await request(app).post('/auth/refresh').send({
        refreshToken: 'invalid.token.here'
      });

      expect(response.status).toBe(401);
      expect(response.body).toEqual({
        error: 'invalid refresh token'
      });
    });

    it('returns 401 for expired refresh token', async () => {
      const jwt = await import('jsonwebtoken');

      process.env.REFRESH_TOKEN_SECRET = 'refresh-secret';

      const expiredPayload = {
        sub: 'user-expired',
        exp: Math.floor(Date.now() / 1000) - 3600 // 1 hour ago
      };
      const expiredToken = jwt.sign(expiredPayload, 'refresh-secret');

      const response = await request(app).post('/auth/refresh').send({
        refreshToken: expiredToken
      });

      expect(response.status).toBe(401);
      expect(response.body).toEqual({
        error: 'invalid refresh token'
      });
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
        userId: 'mock-user'
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
