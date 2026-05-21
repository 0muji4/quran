'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import styles from '../../../../styles/practice.module.css';
import { getAttemptsForToday, getBestScore } from '../../../../lib/storage';

interface Props {
  surahId: string;
  ayahNumber: number;
  durationMs?: number | null;
}

const formatDuration = (ms: number | null | undefined): string => {
  if (typeof ms !== 'number' || !Number.isFinite(ms) || ms <= 0) return '—';
  const totalSec = Math.round(ms / 1000);
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
};

export function SideStats({ surahId, ayahNumber, durationMs }: Props) {
  const [personalBest, setPersonalBest] = useState<number | null>(null);
  const [attemptsToday, setAttemptsToday] = useState<number>(0);
  const t = useTranslations('result.sideStats');

  useEffect(() => {
    const best = getBestScore(surahId, ayahNumber);
    setPersonalBest(best?.score ?? null);
    setAttemptsToday(getAttemptsForToday(surahId, ayahNumber).length);
  }, [surahId, ayahNumber]);

  return (
    <dl className={styles.sideStats}>
      <div className={styles.sideStat}>
        <dt className={styles.sideStatLabel}>{t('personalBest')}</dt>
        <dd className={styles.sideStatValue}>{personalBest ?? '—'}</dd>
      </div>
      <div className={styles.sideStat}>
        <dt className={styles.sideStatLabel}>{t('attemptsToday')}</dt>
        <dd className={styles.sideStatValue}>{attemptsToday}</dd>
      </div>
      <div className={styles.sideStat}>
        <dt className={styles.sideStatLabel}>{t('duration')}</dt>
        <dd className={styles.sideStatValue}>{formatDuration(durationMs)}</dd>
      </div>
    </dl>
  );
}
