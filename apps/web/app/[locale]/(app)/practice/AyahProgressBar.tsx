import styles from '../../../styles/practice.module.css';

interface Props {
  total: number;
  current: number;
}

// Above this many ayahs the per-ayah segment row would overflow the track,
// so the indicator collapses to a continuous bar.
const MAX_SEGMENTS = 12;

export function AyahProgressBar({ total, current }: Props) {
  if (total <= 0) return null;
  const clampedCurrent = Math.max(1, Math.min(current, total));

  return (
    <div className={styles.progressLabel}>
      <span className={styles.progressText}>
        <span className={styles.progressTextPrimary}>Ayah {clampedCurrent} of</span>
        <span className={styles.progressTextSecondary}>{total}</span>
      </span>
      {usesSegmentedProgress(total) ? (
        <span
          className={styles.progressSegments}
          role="progressbar"
          aria-label={`Ayah ${clampedCurrent} of ${total}`}
          aria-valuemin={1}
          aria-valuemax={total}
          aria-valuenow={clampedCurrent}
        >
          {Array.from({ length: total }, (_, index) => {
            const ayah = index + 1;
            const className =
              ayah === clampedCurrent
                ? `${styles.progressSegment} ${styles.progressSegmentActive}`
                : styles.progressSegment;
            return <span key={ayah} className={className} aria-hidden="true" />;
          })}
        </span>
      ) : (
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
            style={{ left: `${indicatorOffsetPercent(clampedCurrent, total)}%` }}
            aria-hidden="true"
          />
        </span>
      )}
    </div>
  );
}

// Short surahs render one segment per ayah; longer ones fall back to the
// continuous bar. Pure helper exposed for unit tests.
export function usesSegmentedProgress(total: number): boolean {
  return total <= MAX_SEGMENTS;
}

// Pure helper exposed for unit tests. Ayah 1 sits at 0%; the final ayah sits
// at 100%. Single-ayah surahs pin to the left so the indicator stays inside
// the track.
export function indicatorOffsetPercent(current: number, total: number): number {
  if (total <= 1) return 0;
  const clamped = Math.max(1, Math.min(current, total));
  return ((clamped - 1) / (total - 1)) * 100;
}
