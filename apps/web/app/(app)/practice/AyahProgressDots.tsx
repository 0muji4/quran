import styles from '../../styles/practice.module.css';

type Props = {
  total: number;
  current: number;
  completed?: ReadonlySet<number>;
};

const MAX_DOTS = 12;

export function AyahProgressDots({ total, current, completed }: Props) {
  if (total <= 0) return null;
  const visibleCount = Math.min(total, MAX_DOTS);
  const dots = Array.from({ length: visibleCount }, (_, i) => {
    // For long surahs we show a sample window of MAX_DOTS centered on current.
    const ayah =
      total <= MAX_DOTS
        ? i + 1
        : Math.max(1, Math.min(total, current - Math.floor(MAX_DOTS / 2) + i + 1));
    return ayah;
  });

  return (
    <div className={styles.progressLabel}>
      <span>
        Ayah {current} of {total}
      </span>
      <span className={styles.dots} aria-hidden="true">
        {dots.map((ayah, i) => {
          const isCurrent = ayah === current;
          const isCompleted = completed?.has(ayah) ?? false;
          const cls = isCurrent
            ? `${styles.dot} ${styles.dotCurrent}`
            : isCompleted
              ? `${styles.dot} ${styles.dotCompleted}`
              : styles.dot;
          return <span key={`${ayah}-${i}`} className={cls} />;
        })}
      </span>
    </div>
  );
}
