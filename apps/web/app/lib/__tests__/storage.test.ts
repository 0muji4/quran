import { describe, it, expect, beforeEach, vi } from 'vitest';
import { recordAttempt, getRecentAttempts, getAttemptsForToday, type Attempt } from '../storage';

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

describe('storage', () => {
  beforeEach(() => {
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
});
