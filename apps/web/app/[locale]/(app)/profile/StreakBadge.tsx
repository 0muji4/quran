'use client';

import { useStoredValue } from '../../../hooks/useLocalStorageState';
import { getRecentAttempts } from '../../../lib/storage';
import { computeHistoryStats } from '../history/historyStats';
import { badgeClass } from './badgeStyles';

const readStreakDays = (): number => computeHistoryStats(getRecentAttempts()).streakDays;

// Streak is computed on the client because the source data lives in
// localStorage (`computeHistoryStats` is reused so the badge matches
// the History tile to the day). Rendered as an empty span on first
// paint to avoid hydration mismatches; once the effect runs and a
// streak is found the badge appears.
export function StreakBadge() {
  const [days] = useStoredValue<number | null>(readStreakDays, null);

  if (days === null || days <= 0) return null;

  return (
    <span className={badgeClass}>
      {/* Isolated, so it keeps its order in right-to-left text. */}
      <bdi>{days}-day streak</bdi>
    </span>
  );
}
