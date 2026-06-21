import type { Attempt } from '../../../lib/storage';

// Stat range: "week" scopes Attempts / Average / Best to the last 7 days;
// "lifetime" uses everything. Streak is always lifetime regardless.
export type HistoryScope = 'week' | 'lifetime';

export interface HistoryStats {
  thisWeekCount: number;
  averageScore: number | null;
  bestScore: number | null;
  bestSurah: string | null;
  /** Ayah number of the best-scoring attempt, for the Best tile's "{surah} · {ayah}" subtitle. */
  bestAyah: number | null;
  streakDays: number;
  /** Longest run of consecutive practiced days ever, for the Streak tile's "best {n}" subtitle. */
  longestStreak: number;
}

const MS_PER_DAY = 24 * 60 * 60 * 1000;

const startOfDay = (date: Date): number => {
  const copy = new Date(date);
  copy.setHours(0, 0, 0, 0);
  return copy.getTime();
};

// Structural twin of iOS `HistoryStats.compute` in
// `apps/ios/Sources/QuranRecitationApp/Features/History/StatsGrid.swift`.
// Pure helper so the math can be unit-tested without a storage layer
// and so the two platforms can be asserted equivalent by parallel test
// cases.
export const computeHistoryStats = (attempts: Attempt[], now: Date = new Date()): HistoryStats => {
  const weekStart = now.getTime() - 7 * MS_PER_DAY;
  const thisWeekCount = attempts.reduce((count, attempt) => {
    const at = new Date(attempt.createdAt).getTime();
    return Number.isFinite(at) && at >= weekStart ? count + 1 : count;
  }, 0);

  const scoredAttempts = attempts.filter((a): a is Attempt & { score: number } => a.score !== null);

  const averageScore =
    scoredAttempts.length === 0
      ? null
      : scoredAttempts.reduce((sum, a) => sum + a.score, 0) / scoredAttempts.length;

  const best = scoredAttempts.reduce<{ score: number; surah: string; ayah: number } | null>(
    (acc, a) => {
      if (acc === null || a.score > acc.score) {
        return { score: a.score, surah: a.surahNameEn, ayah: a.ayahNumber };
      }
      return acc;
    },
    null
  );

  return {
    thisWeekCount,
    averageScore,
    bestScore: best?.score ?? null,
    bestSurah: best?.surah ?? null,
    bestAyah: best?.ayah ?? null,
    streakDays: computeStreak(attempts, now),
    longestStreak: computeLongestStreak(attempts)
  };
};

// Recent score trend (oldest → newest) for a single ayah, feeding the
// per-row Sparkline. Only scored attempts count; capped at `limit` so
// the line stays a glanceable shape rather than a dense chart.
export const scoreTrendForAyah = (
  attempts: Attempt[],
  surahId: string,
  ayahNumber: number,
  limit = 6
): number[] =>
  attempts
    .filter((a) => a.surahId === surahId && a.ayahNumber === ayahNumber && a.score !== null)
    .map((a) => ({ at: new Date(a.createdAt).getTime(), score: a.score as number }))
    .filter((x) => Number.isFinite(x.at))
    .sort((a, b) => a.at - b.at)
    .slice(-limit)
    .map((x) => x.score);

const computeStreak = (attempts: Attempt[], now: Date): number => {
  const practicedDays = new Set<number>();
  for (const attempt of attempts) {
    const date = new Date(attempt.createdAt);
    if (Number.isFinite(date.getTime())) {
      practicedDays.add(startOfDay(date));
    }
  }
  let streak = 0;
  let cursor = startOfDay(now);
  while (practicedDays.has(cursor)) {
    streak += 1;
    cursor -= MS_PER_DAY;
  }
  return streak;
};

// Longest run of consecutive practiced days across the whole history,
// for the Streak tile's "best {n}" subtitle. Independent of `now` — it
// is the personal best, not the current streak.
const computeLongestStreak = (attempts: Attempt[]): number => {
  const days = new Set<number>();
  for (const attempt of attempts) {
    const date = new Date(attempt.createdAt);
    if (Number.isFinite(date.getTime())) {
      days.add(startOfDay(date));
    }
  }
  let longest = 0;
  for (const day of days) {
    // Only count from the start of a run (no prior day) so each run is
    // measured once.
    if (days.has(day - MS_PER_DAY)) continue;
    let run = 1;
    let next = day + MS_PER_DAY;
    while (days.has(next)) {
      run += 1;
      next += MS_PER_DAY;
    }
    longest = Math.max(longest, run);
  }
  return longest;
};
