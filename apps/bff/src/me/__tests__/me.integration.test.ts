import { beforeEach, describe, expect, it, vi } from 'vitest';
import request from 'supertest';
import express, { type Express } from 'express';
import { authMiddleware, MOCK_SESSION_USER_ID } from '../../auth';
import { meRouter } from '../routes';
import {
  getBestScores,
  getLastPracticed,
  getRecentAttempts,
  recordPracticeAttempt,
  upsertBestScore,
  upsertLastPracticed
} from '../storage';

vi.mock('../storage', () => ({
  getLastPracticed: vi.fn(),
  getBestScores: vi.fn(),
  getRecentAttempts: vi.fn(),
  upsertLastPracticed: vi.fn(),
  upsertBestScore: vi.fn(),
  recordPracticeAttempt: vi.fn()
}));

vi.mock('../../telemetry', () => ({
  telemetry: {
    meter: {
      createHistogram: vi.fn(() => ({ record: vi.fn() }))
    }
  },
  logger: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn()
  }
}));

describe('GET /me/* read endpoints', () => {
  let app: Express;

  beforeEach(() => {
    vi.clearAllMocks();
    app = express();
    app.use(express.json());
    app.use(authMiddleware);
    app.use(meRouter);
    process.env.MOCK_SESSION = 'true';
    process.env.NODE_ENV = 'test';
  });

  describe('GET /me/last-practiced', () => {
    it('returns the row from storage as JSON', async () => {
      const row = {
        surahId: '1',
        ayahNumber: 3,
        surahNameEn: 'Al-Fatihah',
        surahNameAr: 'الفاتحة',
        ayahCount: 7,
        practicedAt: '2026-05-09T10:00:00.000Z'
      };
      vi.mocked(getLastPracticed).mockResolvedValue(row);

      const res = await request(app).get('/me/last-practiced');

      expect(res.status).toBe(200);
      expect(res.body).toEqual(row);
      expect(getLastPracticed).toHaveBeenCalledWith(MOCK_SESSION_USER_ID);
    });

    it('returns null when storage has no row', async () => {
      vi.mocked(getLastPracticed).mockResolvedValue(null);

      const res = await request(app).get('/me/last-practiced');

      expect(res.status).toBe(200);
      expect(res.body).toBeNull();
    });

    it('returns 502 when storage throws', async () => {
      vi.mocked(getLastPracticed).mockRejectedValue(new Error('boom'));

      const res = await request(app).get('/me/last-practiced');

      expect(res.status).toBe(502);
      expect(res.body).toEqual({ error: 'Failed to fetch last-practiced' });
    });

    it('returns 401 when MOCK_SESSION is off and no auth header is sent', async () => {
      process.env.MOCK_SESSION = 'false';

      const res = await request(app).get('/me/last-practiced');

      expect(res.status).toBe(401);
      expect(getLastPracticed).not.toHaveBeenCalled();
    });
  });

  describe('GET /me/best-scores', () => {
    it('returns the keyed map from storage', async () => {
      const scores = {
        '1:1': { score: 92, achievedAt: '2026-05-09T10:00:00.000Z' },
        '1:2': { score: 78, achievedAt: '2026-05-09T11:00:00.000Z' }
      };
      vi.mocked(getBestScores).mockResolvedValue(scores);

      const res = await request(app).get('/me/best-scores');

      expect(res.status).toBe(200);
      expect(res.body).toEqual(scores);
    });

    it('returns 502 when storage throws', async () => {
      vi.mocked(getBestScores).mockRejectedValue(new Error('boom'));

      const res = await request(app).get('/me/best-scores');

      expect(res.status).toBe(502);
    });
  });

  describe('GET /me/attempts', () => {
    it('returns attempts wrapped in an envelope and defaults limit to 50', async () => {
      const attempts = [
        {
          id: 'a1',
          surahId: '1',
          surahNameEn: 'Al-Fatihah',
          ayahNumber: 1,
          score: 92,
          jobId: 'job-1',
          status: 'COMPLETED' as const,
          durationMs: 4200,
          createdAt: '2026-05-09T10:00:00.000Z'
        }
      ];
      vi.mocked(getRecentAttempts).mockResolvedValue(attempts);

      const res = await request(app).get('/me/attempts');

      expect(res.status).toBe(200);
      expect(res.body).toEqual({ attempts });
      expect(getRecentAttempts).toHaveBeenCalledWith(MOCK_SESSION_USER_ID, 50);
    });

    it('honors a custom limit query param', async () => {
      vi.mocked(getRecentAttempts).mockResolvedValue([]);

      const res = await request(app).get('/me/attempts?limit=10');

      expect(res.status).toBe(200);
      expect(getRecentAttempts).toHaveBeenCalledWith(MOCK_SESSION_USER_ID, 10);
    });

    it('rejects a non-numeric limit with 400', async () => {
      const res = await request(app).get('/me/attempts?limit=banana');

      expect(res.status).toBe(400);
      expect(getRecentAttempts).not.toHaveBeenCalled();
    });

    it('rejects a limit above 200 with 400', async () => {
      const res = await request(app).get('/me/attempts?limit=201');

      expect(res.status).toBe(400);
      expect(getRecentAttempts).not.toHaveBeenCalled();
    });
  });

  describe('PUT /me/last-practiced', () => {
    const validBody = {
      surahId: '1',
      ayahNumber: 3,
      surahNameEn: 'Al-Fatihah',
      surahNameAr: 'الفاتحة',
      ayahCount: 7,
      practicedAt: '2026-05-09T10:00:00.000Z'
    };

    it('upserts and echoes the body on success', async () => {
      vi.mocked(upsertLastPracticed).mockResolvedValue(validBody);

      const res = await request(app).put('/me/last-practiced').send(validBody);

      expect(res.status).toBe(200);
      expect(res.body).toEqual(validBody);
      expect(upsertLastPracticed).toHaveBeenCalledWith(MOCK_SESSION_USER_ID, validBody);
    });

    it('rejects a missing field with 400', async () => {
      const res = await request(app)
        .put('/me/last-practiced')
        .send({ ...validBody, surahId: undefined });

      expect(res.status).toBe(400);
      expect(upsertLastPracticed).not.toHaveBeenCalled();
    });

    it('rejects a non-ISO practicedAt with 400', async () => {
      const res = await request(app)
        .put('/me/last-practiced')
        .send({ ...validBody, practicedAt: 'yesterday' });

      expect(res.status).toBe(400);
    });

    it('returns 502 when storage throws', async () => {
      vi.mocked(upsertLastPracticed).mockRejectedValue(new Error('boom'));

      const res = await request(app).put('/me/last-practiced').send(validBody);

      expect(res.status).toBe(502);
    });
  });

  describe('PUT /me/best-scores/:key', () => {
    const body = { score: 92, achievedAt: '2026-05-09T10:00:00.000Z' };

    it('upserts on a valid key', async () => {
      vi.mocked(upsertBestScore).mockResolvedValue(body);

      const res = await request(app).put('/me/best-scores/2:255').send(body);

      expect(res.status).toBe(200);
      expect(res.body).toEqual(body);
      expect(upsertBestScore).toHaveBeenCalledWith(MOCK_SESSION_USER_ID, '2', 255, body);
    });

    it('rejects a key without the colon separator', async () => {
      const res = await request(app).put('/me/best-scores/2255').send(body);

      expect(res.status).toBe(400);
      expect(upsertBestScore).not.toHaveBeenCalled();
    });

    it('rejects a score above 100 with 400', async () => {
      const res = await request(app)
        .put('/me/best-scores/1:1')
        .send({ ...body, score: 101 });

      expect(res.status).toBe(400);
    });
  });

  describe('POST /me/attempts', () => {
    const body = {
      surahId: '1',
      surahNameEn: 'Al-Fatihah',
      ayahNumber: 1,
      score: 92,
      jobId: 'job-1',
      status: 'COMPLETED' as const,
      durationMs: 4200,
      createdAt: '2026-05-09T10:00:00.000Z'
    };

    it('records and returns 201 with the inserted row including id', async () => {
      vi.mocked(recordPracticeAttempt).mockResolvedValue({
        id: 'a1',
        ...body
      });

      const res = await request(app).post('/me/attempts').send(body);

      expect(res.status).toBe(201);
      expect(res.body).toEqual({ id: 'a1', ...body });
      expect(recordPracticeAttempt).toHaveBeenCalledWith(MOCK_SESSION_USER_ID, body);
    });

    it('accepts a null score (failed attempt)', async () => {
      vi.mocked(recordPracticeAttempt).mockResolvedValue({
        id: 'a2',
        ...body,
        score: null,
        status: 'FAILED'
      });

      const res = await request(app)
        .post('/me/attempts')
        .send({ ...body, score: null, status: 'FAILED' });

      expect(res.status).toBe(201);
      expect(res.body.score).toBeNull();
    });

    it('coerces an absent durationMs to null', async () => {
      vi.mocked(recordPracticeAttempt).mockResolvedValue({
        id: 'a3',
        ...body,
        durationMs: null
      });

      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { durationMs: _omit, ...rest } = body;
      const res = await request(app).post('/me/attempts').send(rest);

      expect(res.status).toBe(201);
      expect(recordPracticeAttempt).toHaveBeenCalledWith(
        MOCK_SESSION_USER_ID,
        expect.objectContaining({ durationMs: null })
      );
    });

    it('rejects an unknown status with 400', async () => {
      const res = await request(app)
        .post('/me/attempts')
        .send({ ...body, status: 'WIP' });

      expect(res.status).toBe(400);
    });
  });
});
