'use client';

import { useEffect, useState } from 'react';
import styles from '../styles/practice.module.css';

const IDLE_HEIGHTS = [
  0.18, 0.32, 0.5, 0.34, 0.22, 0.4, 0.62, 0.48, 0.28, 0.36, 0.5, 0.66, 0.7, 0.52, 0.34, 0.42, 0.58,
  0.66, 0.5, 0.36, 0.22, 0.32, 0.46, 0.6, 0.52, 0.38, 0.24, 0.34, 0.46, 0.32, 0.2, 0.16
];
const BAR_COUNT = IDLE_HEIGHTS.length;

type Props = {
  // 'recording' (default): live mic levels when `live`, otherwise a static
  // idle silhouette.
  // 'analysing': sin-wave shimmer driven by an internal ticker, no mic input.
  mode?: 'recording' | 'analysing';
  live?: boolean;
  levels?: number[];
};

const shimmer = (tick: number): number[] =>
  Array.from({ length: BAR_COUNT }, (_, i) => {
    const phaseA = Math.sin(i * 0.55 + tick * 0.18);
    const phaseB = Math.sin(i * 0.21 + tick * 0.09);
    return 0.32 + 0.32 * Math.abs(phaseA) + 0.18 * Math.abs(phaseB);
  });

export function RecorderBars({ mode = 'recording', live = false, levels }: Props) {
  const [tick, setTick] = useState(0);

  useEffect(() => {
    if (mode !== 'analysing') return;
    const id = setInterval(() => setTick((t) => t + 1), 80);
    return () => clearInterval(id);
  }, [mode]);

  const data =
    mode === 'analysing'
      ? shimmer(tick)
      : live && levels && levels.length > 0
        ? levels
        : IDLE_HEIGHTS;

  return (
    <div className={styles.recorderBars} aria-hidden="true">
      {data.map((value, i) => {
        const heightPct = Math.max(8, Math.min(100, Math.round(value * 100)));
        const cls =
          mode === 'analysing'
            ? `${styles.recorderBar} ${styles.recorderBarAnalysing}`
            : live
              ? `${styles.recorderBar} ${styles.recorderBarLive}`
              : styles.recorderBar;
        return <span key={i} className={cls} style={{ height: `${heightPct}%` }} />;
      })}
    </div>
  );
}
