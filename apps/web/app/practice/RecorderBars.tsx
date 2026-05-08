'use client';

import styles from '../styles/practice.module.css';

const IDLE_HEIGHTS = [
  0.18, 0.32, 0.5, 0.34, 0.22, 0.4, 0.62, 0.48, 0.28, 0.36, 0.5, 0.66, 0.7, 0.52, 0.34, 0.42, 0.58,
  0.66, 0.5, 0.36, 0.22, 0.32, 0.46, 0.6, 0.52, 0.38, 0.24, 0.34, 0.46, 0.32, 0.2, 0.16
];

type Props = {
  live: boolean;
  levels?: number[];
};

export function RecorderBars({ live, levels }: Props) {
  const data = live && levels && levels.length > 0 ? levels : IDLE_HEIGHTS;
  return (
    <div className={styles.recorderBars} aria-hidden="true">
      {data.map((value, i) => {
        const heightPct = Math.max(8, Math.min(100, Math.round(value * 100)));
        return (
          <span
            key={i}
            className={
              live ? `${styles.recorderBar} ${styles.recorderBarLive}` : styles.recorderBar
            }
            style={{ height: `${heightPct}%` }}
          />
        );
      })}
    </div>
  );
}
