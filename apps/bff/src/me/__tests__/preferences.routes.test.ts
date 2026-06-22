import { beforeEach, describe, expect, it, vi } from 'vitest';
import request from 'supertest';
import express, { type Express } from 'express';
import { authMiddleware, MOCK_SESSION_USER_ID } from '../../auth';
import { meRouter } from '../routes';
import { getUserPreferences, upsertUserPreferences } from '../preferences';
import type { PracticePreferences } from '../preferences';

// importActual keeps the real KNOWN_RECITER_IDS so the route's enum
// validates the shipped set; only the storage fns are stubbed.
vi.mock('../preferences', async () => {
  const actual = await vi.importActual<typeof import('../preferences')>('../preferences');
  return {
    ...actual,
    getUserPreferences: vi.fn(),
    upsertUserPreferences: vi.fn()
  };
});

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

const PREFS: PracticePreferences = {
  referenceReciterId: 'husary-muallim',
  defaultPlaybackSpeed: 1,
  dailyReminderEnabled: false,
  dailyReminderTime: '08:00'
};

describe('/me/preferences', () => {
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

  describe('GET /me/preferences', () => {
    it('returns the preferences from storage wrapped in an envelope', async () => {
      vi.mocked(getUserPreferences).mockResolvedValue(PREFS);

      const res = await request(app).get('/me/preferences');

      expect(res.status).toBe(200);
      expect(res.body).toEqual({ preferences: PREFS });
      expect(getUserPreferences).toHaveBeenCalledWith(MOCK_SESSION_USER_ID);
    });

    it('returns 502 when storage throws', async () => {
      vi.mocked(getUserPreferences).mockRejectedValue(new Error('boom'));

      const res = await request(app).get('/me/preferences');

      expect(res.status).toBe(502);
      expect(res.body).toEqual({ error: 'Failed to fetch preferences' });
    });

    it('returns 401 when MOCK_SESSION is off and no auth header is sent', async () => {
      process.env.MOCK_SESSION = 'false';

      const res = await request(app).get('/me/preferences');

      expect(res.status).toBe(401);
      expect(getUserPreferences).not.toHaveBeenCalled();
    });
  });

  describe('PATCH /me/preferences', () => {
    it('forwards the patch to storage and echoes the stored preferences', async () => {
      const stored = { ...PREFS, dailyReminderEnabled: true, dailyReminderTime: '07:30' };
      vi.mocked(upsertUserPreferences).mockResolvedValue(stored);

      const patch = { dailyReminderEnabled: true, dailyReminderTime: '07:30' };
      const res = await request(app).patch('/me/preferences').send(patch);

      expect(res.status).toBe(200);
      expect(res.body).toEqual({ preferences: stored });
      expect(upsertUserPreferences).toHaveBeenCalledWith(MOCK_SESSION_USER_ID, patch);
    });

    it('accepts a single-field patch', async () => {
      vi.mocked(upsertUserPreferences).mockResolvedValue({ ...PREFS, defaultPlaybackSpeed: 1.5 });

      const res = await request(app).patch('/me/preferences').send({ defaultPlaybackSpeed: 1.5 });

      expect(res.status).toBe(200);
      expect(upsertUserPreferences).toHaveBeenCalledWith(MOCK_SESSION_USER_ID, {
        defaultPlaybackSpeed: 1.5
      });
    });

    it('rejects an empty body with 400', async () => {
      const res = await request(app).patch('/me/preferences').send({});

      expect(res.status).toBe(400);
      expect(upsertUserPreferences).not.toHaveBeenCalled();
    });

    it('rejects a playback speed above 2.0 with 400', async () => {
      const res = await request(app).patch('/me/preferences').send({ defaultPlaybackSpeed: 2.5 });

      expect(res.status).toBe(400);
      expect(upsertUserPreferences).not.toHaveBeenCalled();
    });

    it('rejects a playback speed below 0.5 with 400', async () => {
      const res = await request(app).patch('/me/preferences').send({ defaultPlaybackSpeed: 0.25 });

      expect(res.status).toBe(400);
    });

    it('rejects a malformed reminder time with 400', async () => {
      const res = await request(app).patch('/me/preferences').send({ dailyReminderTime: '99:99' });

      expect(res.status).toBe(400);
      expect(upsertUserPreferences).not.toHaveBeenCalled();
    });

    it('rejects an unknown reciter id with 400', async () => {
      const res = await request(app)
        .patch('/me/preferences')
        .send({ referenceReciterId: 'mishary-rashid' });

      expect(res.status).toBe(400);
      expect(upsertUserPreferences).not.toHaveBeenCalled();
    });

    it('returns 502 when storage throws', async () => {
      vi.mocked(upsertUserPreferences).mockRejectedValue(new Error('boom'));

      const res = await request(app).patch('/me/preferences').send({ dailyReminderEnabled: true });

      expect(res.status).toBe(502);
      expect(res.body).toEqual({ error: 'Failed to update preferences' });
    });

    it('returns 401 when MOCK_SESSION is off and no auth header is sent', async () => {
      process.env.MOCK_SESSION = 'false';

      const res = await request(app).patch('/me/preferences').send({ dailyReminderEnabled: true });

      expect(res.status).toBe(401);
      expect(upsertUserPreferences).not.toHaveBeenCalled();
    });
  });
});
