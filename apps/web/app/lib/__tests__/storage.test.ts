import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  clearLocalCache,
  getBestScore,
  getBestScores,
  getLastPracticed,
  getRecentAttempts,
  migrateAnonymousCacheToBff,
  recordAttempt,
  recordBestScore,
  setLastPracticed,
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

  describe('migrateAnonymousCacheToBff', () => {
    it('replays last-practiced, best scores, and attempts (oldest first) to the BFF', async () => {
      setLastPracticed({
        surahId: '1',
        ayahNumber: 3,
        surahNameEn: 'Al-Fatihah',
        surahNameAr: 'الفاتحة',
        ayahCount: 7,
        practicedAt: '2026-05-09T10:00:00.000Z'
      });
      recordBestScore('1', 1, 70);
      recordBestScore('2', 5, 90);
      recordAttempt(baseAttempt({ id: 'newer', createdAt: '2026-05-09T12:00:00.000Z' }));
      recordAttempt(baseAttempt({ id: 'older', createdAt: '2026-05-08T12:00:00.000Z' }));
      vi.clearAllMocks();

      await migrateAnonymousCacheToBff();

      expect(putLastPracticedToBff).toHaveBeenCalledTimes(1);
      expect(putBestScoreToBff).toHaveBeenCalledTimes(2);
      expect(postAttemptToBff).toHaveBeenCalledTimes(2);
      const replayed = vi
        .mocked(postAttemptToBff)
        .mock.calls.map((call) => (call[0] as Attempt).id);
      expect(replayed).toEqual(['older', 'newer']);
    });

    it('is a no-op when localStorage is empty', async () => {
      await migrateAnonymousCacheToBff();
      expect(putLastPracticedToBff).not.toHaveBeenCalled();
      expect(putBestScoreToBff).not.toHaveBeenCalled();
      expect(postAttemptToBff).not.toHaveBeenCalled();
    });

    it('swallows BFF rejections so sign-up still completes', async () => {
      setLastPracticed({
        surahId: '1',
        ayahNumber: 1,
        surahNameEn: 'Al-Fatihah',
        surahNameAr: 'الفاتحة',
        ayahCount: 7,
        practicedAt: '2026-05-09T10:00:00.000Z'
      });
      vi.mocked(putLastPracticedToBff).mockRejectedValueOnce(new Error('boom'));

      await expect(migrateAnonymousCacheToBff()).resolves.toBeUndefined();
    });
  });
});
