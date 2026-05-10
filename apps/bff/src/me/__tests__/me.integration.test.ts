import { beforeEach, describe, expect, it, vi } from 'vitest';
import request from 'supertest';
import express, { type Express } from 'express';
import { authMiddleware } from '../../auth';
import { meRouter } from '../routes';
import { getBestScores, getLastPracticed, getRecentAttempts } from '../storage';

vi.mock('../storage', () => ({
  getLastPracticed: vi.fn(),
  getBestScores: vi.fn(),
  getRecentAttempts: vi.fn()
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
      expect(getLastPracticed).toHaveBeenCalledWith('mock-user');
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
      expect(getRecentAttempts).toHaveBeenCalledWith('mock-user', 50);
    });

    it('honors a custom limit query param', async () => {
      vi.mocked(getRecentAttempts).mockResolvedValue([]);

      const res = await request(app).get('/me/attempts?limit=10');

      expect(res.status).toBe(200);
      expect(getRecentAttempts).toHaveBeenCalledWith('mock-user', 10);
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
});
