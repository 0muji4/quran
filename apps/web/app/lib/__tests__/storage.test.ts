import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  clearLocalCache,
  getBestScore,
  getBestScores,
  getLastPracticed,
  getRecentAttempts,
  recordAttempt,
  recordBestScore,
  setLastPracticed,
  setSignedInGate,
  getAttemptsForToday,
  type Attempt
} from '../storage';
import {
  fetchAttemptsFromBff,
  fetchBestScoresFromBff,
  fetchLastPracticedFromBff,
  postAttemptToBff,
  putBestScoreToBff,
  putLastPracticedToBff
} from '../../actions';

// storage.ts now fires fire-and-forget Server Action calls to the BFF
// on every read / write. The test environment has no BFF, so stub the
// actions module to no-op resolved promises.
vi.mock('../../actions', () => ({
  fetchAttemptsFromBff: vi.fn(async () => []),
  fetchBestScoresFromBff: vi.fn(async () => ({})),
  fetchLastPracticedFromBff: vi.fn(async () => null),
  postAttemptToBff: vi.fn(async (attempt) => attempt),
  putBestScoreToBff: vi.fn(async (_s, _a, entry) => entry),
  putLastPracticedToBff: vi.fn(async (entry) => entry)
}));

const baseAttempt = (overrides: Partial<Attempt> = {}): Attempt => ({
  id: overrides.id ?? 'job-1',
  surahId: overrides.surahId ?? '1',
  surahNameEn: 'Al-Fatihah',
  ayahNumber: overrides.ayahNumber ?? 1,
  score: 80,
  jobId: overrides.id ?? 'job-1',
  createdAt: overrides.createdAt ?? new Date().toISOString(),
  status: 'COMPLETED',
  ...overrides
});

// Each test gets a clean slate: storage.ts memoises throttle timestamps
// per module load, so we re-import to reset between describe blocks.
const flushPromises = () => new Promise((r) => setTimeout(r, 0));

describe('storage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.localStorage.clear();
    // Default to "signed in" for the bulk of the suite; the gate
    // behaviour gets its own describe block below.
    setSignedInGate(true);
  });

  describe('recordAttempt + getRecentAttempts', () => {
    it('round-trips durationMs', () => {
      recordAttempt(baseAttempt({ id: 'a', durationMs: 8421 }));
      const [latest] = getRecentAttempts(1);
      expect(latest.durationMs).toBe(8421);
    });

    it('omits durationMs when not provided', () => {
      recordAttempt(baseAttempt({ id: 'b' }));
      const [latest] = getRecentAttempts(1);
      expect(latest.durationMs).toBeUndefined();
    });
  });

  describe('getAttemptsForToday', () => {
    // Mid-day UTC stays mid-day in any reasonable local TZ, so toDateString()
    // unambiguously identifies "today" vs "two days ago" regardless of host TZ.
    const today = new Date('2026-05-08T12:00:00.000Z');
    const twoDaysAgo = new Date('2026-05-06T12:00:00.000Z');

    beforeEach(() => {
      vi.setSystemTime(today);
    });

    it('returns only attempts created today for the same surah/ayah', () => {
      recordAttempt(baseAttempt({ id: 'today-1', createdAt: today.toISOString() }));
      recordAttempt(baseAttempt({ id: 'two-days-ago', createdAt: twoDaysAgo.toISOString() }));
      recordAttempt(
        baseAttempt({
          id: 'today-different-ayah',
          ayahNumber: 2,
          createdAt: today.toISOString()
        })
      );
      const matches = getAttemptsForToday('1', 1);
      expect(matches.map((a) => a.id)).toEqual(['today-1']);
    });

    it('returns empty when no attempts exist', () => {
      expect(getAttemptsForToday('1', 1)).toEqual([]);
    });

    it('ignores attempts with malformed createdAt', () => {
      recordAttempt(baseAttempt({ id: 'broken', createdAt: 'not-a-date' }));
      expect(getAttemptsForToday('1', 1)).toEqual([]);
    });
  });

  describe('BFF write fan-out', () => {
    it('setLastPracticed updates cache immediately AND calls the Server Action', async () => {
      const entry = {
        surahId: '1',
        ayahNumber: 3,
        surahNameEn: 'Al-Fatihah',
        surahNameAr: 'الفاتحة',
        ayahCount: 7,
        practicedAt: '2026-05-09T10:00:00.000Z'
      };
      setLastPracticed(entry);
      expect(getLastPracticed()).toEqual(entry); // cache populated synchronously
      await flushPromises();
      expect(putLastPracticedToBff).toHaveBeenCalledWith(entry);
    });

    it('recordBestScore skips the Server Action when the new score is not higher', async () => {
      recordBestScore('1', 1, 80);
      await flushPromises();
      expect(putBestScoreToBff).toHaveBeenCalledTimes(1);

      vi.clearAllMocks();
      recordBestScore('1', 1, 70);
      await flushPromises();
      expect(putBestScoreToBff).not.toHaveBeenCalled();

      const entry = getBestScore('1', 1);
      expect(entry?.score).toBe(80);
    });

    it('recordAttempt fans out to the Server Action with the same payload', async () => {
      const attempt = baseAttempt({ id: 'fan', durationMs: 1234 });
      recordAttempt(attempt);
      await flushPromises();
      expect(postAttemptToBff).toHaveBeenCalledWith(attempt);
    });

    it('recordAttempt surfaces a Server Action failure to the console instead of swallowing it', async () => {
      // The previous behaviour was `.catch(() => {})`, which once
      // masked a multi-hour outage where every attempt was rejected
      // by the BFF as schema-invalid. Keep the failure recoverable
      // (no throw) but make it visible.
      vi.mocked(postAttemptToBff).mockRejectedValueOnce(new Error('boom'));
      const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});

      recordAttempt(baseAttempt({ id: 'fails' }));
      await flushPromises();

      expect(consoleError).toHaveBeenCalledWith(
        expect.stringContaining('recordAttempt BFF write failed'),
        expect.any(Error)
      );
      consoleError.mockRestore();
    });

    it('setLastPracticed surfaces a Server Action failure to the console', async () => {
      vi.mocked(putLastPracticedToBff).mockRejectedValueOnce(new Error('boom'));
      const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});

      setLastPracticed({
        surahId: '1',
        ayahNumber: 1,
        surahNameEn: 'Al-Fatihah',
        surahNameAr: 'الفاتحة',
        ayahCount: 7,
        practicedAt: '2026-05-09T10:00:00.000Z'
      });
      await flushPromises();

      expect(consoleError).toHaveBeenCalledWith(
        expect.stringContaining('setLastPracticed BFF write failed'),
        expect.any(Error)
      );
      consoleError.mockRestore();
    });

    it('recordBestScore surfaces a Server Action failure to the console', async () => {
      vi.mocked(putBestScoreToBff).mockRejectedValueOnce(new Error('boom'));
      const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});

      recordBestScore('9', 9, 99);
      await flushPromises();

      expect(consoleError).toHaveBeenCalledWith(
        expect.stringContaining('recordBestScore BFF write failed'),
        expect.any(Error)
      );
      consoleError.mockRestore();
    });
  });

  describe('BFF read refresh', () => {
    // The refresh throttle is module-scoped, so previous tests may have
    // marked all three keys as recently refreshed. Bump the system
    // clock past the 30 s window before each refresh assertion.
    beforeEach(() => {
      vi.setSystemTime(new Date(Date.now() + 60_000));
    });

    it('getLastPracticed dispatches a refresh on first call', async () => {
      getLastPracticed();
      await flushPromises();
      expect(fetchLastPracticedFromBff).toHaveBeenCalled();
    });

    it('getBestScores dispatches a refresh on first call', async () => {
      getBestScores();
      await flushPromises();
      expect(fetchBestScoresFromBff).toHaveBeenCalled();
    });

    it('getRecentAttempts dispatches a refresh on first call', async () => {
      getRecentAttempts();
      await flushPromises();
      expect(fetchAttemptsFromBff).toHaveBeenCalled();
    });
  });

  describe('clearLocalCache', () => {
    it('drops the previous identity from localStorage and forces the next read to refresh', async () => {
      setLastPracticed({
        surahId: '1',
        ayahNumber: 3,
        surahNameEn: 'Al-Fatihah',
        surahNameAr: 'الفاتحة',
        ayahCount: 7,
        practicedAt: '2026-05-09T10:00:00.000Z'
      });
      recordBestScore('1', 1, 80);
      recordAttempt(baseAttempt({ id: 'pre-signout' }));
      expect(getLastPracticed()).not.toBeNull();

      clearLocalCache();

      expect(window.localStorage.getItem('tilawah:last-practiced')).toBeNull();
      expect(window.localStorage.getItem('tilawah:best-scores')).toBeNull();
      expect(window.localStorage.getItem('tilawah:recent-attempts')).toBeNull();
    });
  });

  describe('signed-in gate', () => {
    const entry = {
      surahId: '1',
      ayahNumber: 3,
      surahNameEn: 'Al-Fatihah',
      surahNameAr: 'الفاتحة',
      ayahCount: 7,
      practicedAt: '2026-05-09T10:00:00.000Z'
    };

    beforeEach(() => {
      setSignedInGate(false);
    });

    it('setLastPracticed drops on the floor and skips the Server Action', async () => {
      setLastPracticed(entry);
      await flushPromises();
      expect(window.localStorage.getItem('tilawah:last-practiced')).toBeNull();
      expect(putLastPracticedToBff).not.toHaveBeenCalled();
    });

    it('recordAttempt drops on the floor and skips the Server Action', async () => {
      recordAttempt(baseAttempt({ id: 'anon' }));
      await flushPromises();
      expect(window.localStorage.getItem('tilawah:recent-attempts')).toBeNull();
      expect(postAttemptToBff).not.toHaveBeenCalled();
    });

    it('recordBestScore drops on the floor and skips the Server Action', async () => {
      recordBestScore('1', 1, 90);
      await flushPromises();
      expect(window.localStorage.getItem('tilawah:best-scores')).toBeNull();
      expect(putBestScoreToBff).not.toHaveBeenCalled();
    });

    it('getLastPracticed returns null even when localStorage has stale data', () => {
      window.localStorage.setItem('tilawah:last-practiced', JSON.stringify(entry));
      expect(getLastPracticed()).toBeNull();
    });

    it('getBestScores returns an empty map even when localStorage has stale data', () => {
      window.localStorage.setItem(
        'tilawah:best-scores',
        JSON.stringify({ '1:1': { score: 80, achievedAt: '2026-05-09T10:00:00.000Z' } })
      );
      expect(getBestScores()).toEqual({});
    });

    it('getRecentAttempts returns an empty array even when localStorage has stale data', () => {
      window.localStorage.setItem(
        'tilawah:recent-attempts',
        JSON.stringify({ attempts: [baseAttempt({ id: 'stale' })] })
      );
      expect(getRecentAttempts()).toEqual([]);
    });

    it('refresh helpers do not fetch while the gate is closed', async () => {
      getLastPracticed();
      getBestScores();
      getRecentAttempts();
      await flushPromises();
      expect(fetchLastPracticedFromBff).not.toHaveBeenCalled();
      expect(fetchBestScoresFromBff).not.toHaveBeenCalled();
      expect(fetchAttemptsFromBff).not.toHaveBeenCalled();
    });

    it('clearLocalCache still wipes the cache regardless of gate state', () => {
      window.localStorage.setItem('tilawah:last-practiced', JSON.stringify(entry));
      clearLocalCache();
      expect(window.localStorage.getItem('tilawah:last-practiced')).toBeNull();
    });
  });
});
