import styles from '../../styles/practice.module.css';

type Props = {
  score: number | null;
  size?: number;
  strokeWidth?: number;
};

// Circular score dial. Server-renderable (no state).
// 0–100 maps to a 0–360 deg arc starting from 12 o'clock, sweeping clockwise.
export function ScoreDial({ score, size = 156, strokeWidth = 12 }: Props) {
  const display = score === null || Number.isNaN(score) ? '—' : Math.round(score).toString();
  const safe = score === null || Number.isNaN(score) ? 0 : Math.max(0, Math.min(100, score));
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference * (1 - safe / 100);

  return (
    <div className={styles.scoreDial} style={{ width: size, height: size }}>
      <svg
        className={styles.scoreDialSvg}
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        aria-hidden="true"
      >
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          className={styles.scoreDialTrack}
          strokeWidth={strokeWidth}
          fill="none"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          className={styles.scoreDialProgress}
          strokeWidth={strokeWidth}
          fill="none"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </svg>
      <div className={styles.scoreDialCenter}>
        <span className={styles.scoreDialNumber}>{display}</span>
        <span className={styles.scoreDialUnit}>OUT OF 100</span>
      </div>
    </div>
  );
}
