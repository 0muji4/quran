import { describe, it, expect } from 'vitest';
import { computeHistoryStats } from '../historyStats';
import type { Attempt } from '../../../../lib/storage';

// Use `in` so that `score: null` overrides are honored. Plain `??`
// would coalesce null back into 80 and silently break the
// "ignore null scores" tests.
const attempt = (overrides: Partial<Attempt> & { createdAt: string }): Attempt => ({
  id: overrides.id ?? `att-${overrides.createdAt}`,
  surahId: overrides.surahId ?? '1',
  surahNameEn: overrides.surahNameEn ?? 'Al-Fatihah',
  ayahNumber: overrides.ayahNumber ?? 1,
  score: 'score' in overrides ? (overrides.score ?? null) : 80,
  jobId: overrides.jobId ?? 'job-1',
  createdAt: overrides.createdAt,
  status: overrides.status ?? 'COMPLETED'
});

// `computeHistoryStats` uses the local time zone for day-bucketing
// (matching iOS `Calendar.current.startOfDay`). Pick a NOW that sits
// at UTC midday so the local-time "today" lines up across CI (UTC)
// and dev (often JST/PDT). Attempt timestamps below are likewise
// chosen so the local-time date never disagrees with the UTC date.
const NOW = new Date('2026-05-16T12:00:00Z');

describe('computeHistoryStats', () => {
  it('returns zeros / nulls for an empty list', () => {
    const stats = computeHistoryStats([], NOW);
    expect(stats.thisWeekCount).toBe(0);
    expect(stats.averageScore).toBeNull();
    expect(stats.bestScore).toBeNull();
    expect(stats.bestSurah).toBeNull();
    expect(stats.streakDays).toBe(0);
  });

  it('counts attempts within the past 7 days', () => {
    const stats = computeHistoryStats(
      [
        attempt({ createdAt: '2026-05-16T11:00:00Z' }), // today
        attempt({ createdAt: '2026-05-12T11:00:00Z' }), // 4 days ago
        attempt({ createdAt: '2026-05-09T13:00:00Z' }), // just inside 7d window
        attempt({ createdAt: '2026-05-09T11:00:00Z' }) // just outside 7d window (>168h ago)
      ],
      NOW
    );
    expect(stats.thisWeekCount).toBe(3);
  });

  it('averages only scored attempts, ignoring null scores', () => {
    const stats = computeHistoryStats(
      [
        attempt({ createdAt: '2026-05-16T11:00:00Z', score: 80 }),
        attempt({ createdAt: '2026-05-15T11:00:00Z', score: 40 }),
        attempt({ createdAt: '2026-05-14T11:00:00Z', score: null, status: 'FAILED' as const })
      ],
      NOW
    );
    expect(stats.averageScore).toBe(60);
  });

  it('returns null average when no attempt has a score', () => {
    const stats = computeHistoryStats(
      [attempt({ createdAt: '2026-05-15T11:00:00Z', score: null, status: 'FAILED' as const })],
      NOW
    );
    expect(stats.averageScore).toBeNull();
  });

  it('reports the best score and the surah it belongs to', () => {
    const stats = computeHistoryStats(
      [
        attempt({ createdAt: '2026-05-16T11:00:00Z', score: 75, surahNameEn: 'Al-Fatihah' }),
        attempt({ createdAt: '2026-05-15T11:00:00Z', score: 92, surahNameEn: 'Al-Ikhlas' }),
        attempt({ createdAt: '2026-05-14T11:00:00Z', score: 88, surahNameEn: 'Al-Baqarah' })
      ],
      NOW
    );
    expect(stats.bestScore).toBe(92);
    expect(stats.bestSurah).toBe('Al-Ikhlas');
  });

  it('counts a streak of consecutive practice days ending today', () => {
    // Pick times that land on the same calendar day in any reasonable
    // local zone (we use local-zone day bucketing). NOW is UTC noon,
    // so attempts within a few hours of UTC noon are also "today"
    // everywhere from UTC-12 to UTC+12.
    const stats = computeHistoryStats(
      [
        attempt({ createdAt: '2026-05-16T11:00:00Z' }), // today
        attempt({ createdAt: '2026-05-15T11:00:00Z' }), // yesterday
        attempt({ createdAt: '2026-05-14T11:00:00Z' }), // 2 days ago
        attempt({ createdAt: '2026-05-12T11:00:00Z' }) // gap on 2026-05-13 — chain breaks
      ],
      NOW
    );
    expect(stats.streakDays).toBe(3);
  });

  it('returns a streak of 0 if there is no attempt today', () => {
    const stats = computeHistoryStats(
      [attempt({ createdAt: '2026-05-15T11:00:00Z' })], // only yesterday (UTC midday)
      NOW
    );
    expect(stats.streakDays).toBe(0);
  });
});
