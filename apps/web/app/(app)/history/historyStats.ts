import type { Attempt } from '../../lib/storage';

export type HistoryStats = {
  thisWeekCount: number;
  averageScore: number | null;
  bestScore: number | null;
  bestSurah: string | null;
  streakDays: number;
};

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

  const best = scoredAttempts.reduce<{ score: number; surah: string } | null>((acc, a) => {
    if (acc === null || a.score > acc.score) {
      return { score: a.score, surah: a.surahNameEn };
    }
    return acc;
  }, null);

  return {
    thisWeekCount,
    averageScore,
    bestScore: best?.score ?? null,
    bestSurah: best?.surah ?? null,
    streakDays: computeStreak(attempts, now)
  };
};

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
