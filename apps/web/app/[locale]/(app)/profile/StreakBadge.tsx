'use client';

import { useEffect, useState } from 'react';
import { getRecentAttempts } from '../../../lib/storage';
import { computeHistoryStats } from '../history/historyStats';
import { css, cx } from '../../../../styled-system/css';

const badgeClass = css({
  fontSize: '[11px]',
  fontWeight: 600,
  textTransform: 'uppercase',
  letterSpacing: '[0.06em]',
  paddingBlock: '1',
  paddingInline: '3',
  borderRadius: 'pill',
  backgroundColor: 'gold.surface',
  color: 'gold.onLight',
  display: 'inline-flex',
  alignItems: 'center',
  gap: '1'
});

// Streak is computed on the client because the source data lives in
// localStorage (`computeHistoryStats` is reused so the badge matches
// the History tile to the day). Rendered as an empty span on first
// paint to avoid hydration mismatches; once the effect runs and a
// streak is found the badge appears.
export function StreakBadge() {
  const [days, setDays] = useState<number | null>(null);

  useEffect(() => {
    const stats = computeHistoryStats(getRecentAttempts());
    setDays(stats.streakDays);
  }, []);

  if (days === null || days <= 0) return null;

  return (
    <span className={cx(badgeClass)}>
      <span aria-hidden="true">✦</span> {days}-day streak
    </span>
  );
}
