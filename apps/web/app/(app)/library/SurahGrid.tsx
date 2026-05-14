'use client';

import { useEffect, useState } from 'react';
import type { SurahSummary } from '../../lib/types';
import { getBestScores, getLastPracticed } from '../../lib/storage';
import { SurahCard } from './SurahCard';
import styles from '../../styles/library.module.css';

type Props = {
  surahs: SurahSummary[];
};

type Snapshot = {
  bestScores: Record<string, number>; // surahId → max best across ayahs (rounded to int)
  lastPracticedSurahId: string | null;
};

const buildSnapshot = (): Snapshot => {
  const all = getBestScores();
  const bestPerSurah: Record<string, number> = {};
  for (const [k, v] of Object.entries(all)) {
    const [surahId] = k.split(':');
    const score = Math.round(v.score);
    if (!(surahId in bestPerSurah) || score > bestPerSurah[surahId]) {
      bestPerSurah[surahId] = score;
    }
  }
  return {
    bestScores: bestPerSurah,
    lastPracticedSurahId: getLastPracticed()?.surahId ?? null
  };
};

export function SurahGrid({ surahs }: Props) {
  const [snapshot, setSnapshot] = useState<Snapshot>({
    bestScores: {},
    lastPracticedSurahId: null
  });

  useEffect(() => {
    setSnapshot(buildSnapshot());
    const onStorage = () => setSnapshot(buildSnapshot());
    if (typeof window !== 'undefined') {
      window.addEventListener('storage', onStorage);
      return () => window.removeEventListener('storage', onStorage);
    }
    return undefined;
  }, []);

  if (surahs.length === 0) {
    return <p className={styles.empty}>No surahs match your search.</p>;
  }

  return (
    <div className={styles.grid}>
      {surahs.map((surah) => (
        <SurahCard
          key={surah.id}
          surah={surah}
          bestScore={snapshot.bestScores[surah.id] ?? null}
          isLastPracticed={snapshot.lastPracticedSurahId === surah.id}
        />
      ))}
    </div>
  );
}
