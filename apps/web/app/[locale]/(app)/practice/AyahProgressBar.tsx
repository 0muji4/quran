import styles from '../../../styles/practice.module.css';

type Props = {
  total: number;
  current: number;
};

export function AyahProgressBar({ total, current }: Props) {
  if (total <= 0) return null;
  const clampedCurrent = Math.max(1, Math.min(current, total));
  const percent = indicatorOffsetPercent(clampedCurrent, total);

  return (
    <div className={styles.progressLabel}>
      <span className={styles.progressText}>
        <span className={styles.progressTextPrimary}>Ayah {clampedCurrent} of</span>
        <span className={styles.progressTextSecondary}>{total}</span>
      </span>
      <span
        className={styles.progressTrack}
        role="progressbar"
        aria-label={`Ayah ${clampedCurrent} of ${total}`}
        aria-valuemin={1}
        aria-valuemax={total}
        aria-valuenow={clampedCurrent}
      >
        <span
          className={styles.progressIndicator}
          style={{ left: `${percent}%` }}
          aria-hidden="true"
        />
      </span>
    </div>
  );
}

// Pure helper exposed for unit tests. Ayah 1 sits at 0%; the final ayah sits
// at 100%. Single-ayah surahs pin to the left so the indicator stays inside
// the track. Mirrors `PracticeView.indicatorOffset` on iOS.
export function indicatorOffsetPercent(current: number, total: number): number {
  if (total <= 1) return 0;
  const clamped = Math.max(1, Math.min(current, total));
  return ((clamped - 1) / (total - 1)) * 100;
}
