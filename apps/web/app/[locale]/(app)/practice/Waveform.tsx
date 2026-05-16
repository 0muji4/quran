'use client';

import { useMemo } from 'react';
import styles from '../../../styles/practice.module.css';

const BAR_COUNT = 48;

// Mulberry32: deterministic PRNG → same surah/ayah always renders the same shape.
const mulberry32 = (seed: number) => {
  return () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = seed;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};

type Props = {
  seed: number;
  progress: number; // 0..1
};

export function Waveform({ seed, progress }: Props) {
  const heights = useMemo(() => {
    const rand = mulberry32(seed || 1);
    return Array.from({ length: BAR_COUNT }, (_, i) => {
      // Envelope so the waveform feels natural (smaller at edges, larger in the middle).
      const t = i / (BAR_COUNT - 1);
      const envelope = Math.sin(t * Math.PI);
      const noise = 0.45 + rand() * 0.55;
      return Math.max(0.18, envelope * noise);
    });
  }, [seed]);

  const playedIndex = Math.floor(Math.max(0, Math.min(1, progress)) * BAR_COUNT);

  return (
    <div className={styles.waveform} aria-hidden="true">
      {heights.map((h, i) => (
        <span
          key={i}
          className={i < playedIndex ? `${styles.waveBar} ${styles.waveBarPlayed}` : styles.waveBar}
          style={{ height: `${Math.round(h * 100)}%` }}
        />
      ))}
    </div>
  );
}
