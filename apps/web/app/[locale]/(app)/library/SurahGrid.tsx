'use client';

import { useEffect, useState } from 'react';
import type { SurahSummary } from '../../../lib/types';
import { getBestScores, getLastPracticed } from '../../../lib/storage';
import { SurahCard } from './SurahCard';
import { css } from '../../../../styled-system/css';

interface Props {
  surahs: SurahSummary[];
}

interface Snapshot {
  bestScores: Record<string, number>; // surahId → max best across ayahs (rounded to int)
  lastPracticedSurahId: string | null;
}

const GRID_MOBILE_MQ = '@media (max-width: 760px)';

const emptyClass = css({
  textAlign: 'center',
  padding: '10',
  color: 'ink.muted'
});

const gridClass = css({
  display: 'grid',
  gridTemplateColumns: 'repeat(2, 1fr)',
  gap: '4',
  [GRID_MOBILE_MQ]: { gridTemplateColumns: '1fr' }
});

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
    return <p className={emptyClass}>No surahs match your search.</p>;
  }

  return (
    <div className={gridClass}>
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
