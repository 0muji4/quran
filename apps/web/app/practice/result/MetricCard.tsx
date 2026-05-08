import styles from '../../styles/practice.module.css';

type Props = {
  label: string;
  // 0..1 fraction (matches PronunciationFeedback.accuracy etc).
  value: number | null | undefined;
  description: string;
  tone?: 'amber' | 'red' | 'teal';
};

const toPercent = (
  v: number | null | undefined
): { display: string; pct: number; tone: Props['tone'] } => {
  if (typeof v !== 'number' || Number.isNaN(v)) {
    return { display: '—', pct: 0, tone: 'red' };
  }
  const pct = Math.max(0, Math.min(100, v * 100));
  let tone: Props['tone'] = 'red';
  if (pct >= 80) tone = 'teal';
  else if (pct >= 50) tone = 'amber';
  return { display: `${pct.toFixed(1)}%`, pct, tone };
};

export function MetricCard({ label, value, description, tone }: Props) {
  const computed = toPercent(value);
  const effectiveTone = tone ?? computed.tone;
  const trackClass =
    effectiveTone === 'teal'
      ? styles.metricBarFillTeal
      : effectiveTone === 'amber'
        ? styles.metricBarFillAmber
        : styles.metricBarFillRed;

  return (
    <div className={styles.metricCard}>
      <div className={styles.metricCardHead}>
        <span className={styles.metricCardLabel}>{label}</span>
        <span className={styles.metricCardValue}>{computed.display}</span>
      </div>
      <div className={styles.metricBarTrack} aria-hidden="true">
        <span className={trackClass} style={{ width: `${computed.pct}%` }} />
      </div>
      <p className={styles.metricCardDescription}>{description}</p>
    </div>
  );
}
