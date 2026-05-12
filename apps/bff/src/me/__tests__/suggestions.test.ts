import { beforeEach, describe, expect, it, vi } from 'vitest';
import request from 'supertest';
import express, { type Express } from 'express';
import { authMiddleware, MOCK_SESSION_USER_ID } from '../../auth';
import { meRouter } from '../routes';
import { composeSuggestion, FALLBACK_SURAH_ID } from '../suggestions';
import { getSuggestion } from '../suggestions';

vi.mock('../suggestions', async () => {
  const actual = await vi.importActual<typeof import('../suggestions')>('../suggestions');
  return {
    ...actual,
    getSuggestion: vi.fn()
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

describe('composeSuggestion', () => {
  const NOW = new Date('2026-05-12T00:00:00.000Z');

  const shortMeccan = [
    { surahId: '103', ayahCount: 3 },
    { surahId: '108', ayahCount: 3 },
    { surahId: '110', ayahCount: 3 },
    { surahId: '112', ayahCount: 4 }
  ];

  it('falls back to Al-Ikhlas when no surahs are available at all', () => {
    const result = composeSuggestion({
      avgScores: [],
      lastAttempts: [],
      shortMeccan: [],
      now: NOW
    });
    expect(result.suggested).toEqual({ surahId: FALLBACK_SURAH_ID, reason: 'fallback' });
    expect(result.difficulties).toEqual({});
  });

  it('prefers an unpracticed short Meccan surah (lowest surahId)', () => {
    const result = composeSuggestion({
      avgScores: [],
      lastAttempts: [],
      shortMeccan,
      now: NOW
    });
    expect(result.suggested).toEqual({ surahId: '103', reason: 'short_unpracticed' });
  });

  it('skips surahs practised inside the recent window', () => {
    const recent = new Date(NOW.getTime() - 2 * 24 * 60 * 60 * 1000); // 2 days ago
    const result = composeSuggestion({
      avgScores: [],
      lastAttempts: [
        { surahId: '103', latestAt: recent },
        { surahId: '108', latestAt: recent }
      ],
      shortMeccan,
      now: NOW
    });
    // 110 and 112 remain unpracticed → 110 wins by id order.
    expect(result.suggested).toEqual({ surahId: '110', reason: 'short_unpracticed' });
  });

  it('picks the weakest lapsed surah when all candidates were practised but are stale', () => {
    const stale = new Date(NOW.getTime() - 30 * 24 * 60 * 60 * 1000); // 30 days ago
    const result = composeSuggestion({
      avgScores: [
        { surahId: '103', avgScore: 92 },
        { surahId: '108', avgScore: 55 },
        { surahId: '110', avgScore: 70 },
        { surahId: '112', avgScore: 88 }
      ],
      lastAttempts: shortMeccan.map((s) => ({ surahId: s.surahId, latestAt: stale })),
      shortMeccan,
      now: NOW
    });
    expect(result.suggested).toEqual({ surahId: '108', reason: 'short_low_score' });
  });

  it('falls back to Al-Ikhlas when every candidate was practised recently', () => {
    const recent = new Date(NOW.getTime() - 1 * 24 * 60 * 60 * 1000); // 1 day ago
    const result = composeSuggestion({
      avgScores: [],
      lastAttempts: shortMeccan.map((s) => ({ surahId: s.surahId, latestAt: recent })),
      shortMeccan,
      now: NOW
    });
    expect(result.suggested).toEqual({ surahId: FALLBACK_SURAH_ID, reason: 'fallback' });
  });

  it('buckets avg scores into easy / medium / hard', () => {
    const result = composeSuggestion({
      avgScores: [
        { surahId: '1', avgScore: 95 },
        { surahId: '2', avgScore: 84 },
        { surahId: '3', avgScore: 60 },
        { surahId: '4', avgScore: 59 }
      ],
      lastAttempts: [],
      shortMeccan: [],
      now: NOW
    });
    expect(result.difficulties).toEqual({
      '1': 'easy',
      '2': 'medium',
      '3': 'medium',
      '4': 'hard'
    });
  });

  it('handles fractional averages at bucket boundaries deterministically', () => {
    const result = composeSuggestion({
      avgScores: [
        { surahId: '1', avgScore: 85 }, // exactly at easy floor
        { surahId: '2', avgScore: 84.999 } // just below
      ],
      lastAttempts: [],
      shortMeccan: [],
      now: NOW
    });
    expect(result.difficulties).toEqual({
      '1': 'easy',
      '2': 'medium'
    });
  });

  it('breaks lapsed-candidate ties on numeric surahId', () => {
    const stale = new Date(NOW.getTime() - 30 * 24 * 60 * 60 * 1000);
    const result = composeSuggestion({
      avgScores: [
        { surahId: '110', avgScore: 60 },
        { surahId: '103', avgScore: 60 }
      ],
      lastAttempts: [
        { surahId: '103', latestAt: stale },
        { surahId: '110', latestAt: stale }
      ],
      shortMeccan: [
        { surahId: '110', ayahCount: 3 },
        { surahId: '103', ayahCount: 3 }
      ],
      now: NOW
    });
    expect(result.suggested.surahId).toBe('103');
  });
});

describe('GET /me/suggestions', () => {
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

  it('returns the suggestion payload as JSON', async () => {
    const payload = {
      suggested: { surahId: '103', reason: 'short_unpracticed' as const },
      difficulties: { '1': 'easy' as const }
    };
    vi.mocked(getSuggestion).mockResolvedValue(payload);

    const res = await request(app).get('/me/suggestions');

    expect(res.status).toBe(200);
    expect(res.body).toEqual(payload);
    expect(getSuggestion).toHaveBeenCalledWith(MOCK_SESSION_USER_ID);
  });

  it('returns 502 when the computation throws', async () => {
    vi.mocked(getSuggestion).mockRejectedValue(new Error('boom'));

    const res = await request(app).get('/me/suggestions');

    expect(res.status).toBe(502);
    expect(res.body).toEqual({ error: 'Failed to compute suggestion' });
  });

  it('returns 401 when MOCK_SESSION is off and no auth header is sent', async () => {
    process.env.MOCK_SESSION = 'false';

    const res = await request(app).get('/me/suggestions');

    expect(res.status).toBe(401);
    expect(getSuggestion).not.toHaveBeenCalled();
  });
});
