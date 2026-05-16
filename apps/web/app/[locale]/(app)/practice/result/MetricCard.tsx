import styles from '../../../../styles/practice.module.css';

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

  const labelId = `metric-${label.toLowerCase().replace(/\s+/g, '-')}`;
  const isUnknown = computed.display === '—';

  return (
    <div className={styles.metricCard}>
      <div className={styles.metricCardHead}>
        <span id={labelId} className={styles.metricCardLabel}>
          {label}
        </span>
        <span className={styles.metricCardValue} aria-hidden="true">
          {computed.display}
        </span>
      </div>
      <div
        className={styles.metricBarTrack}
        role="progressbar"
        aria-labelledby={labelId}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={isUnknown ? undefined : Math.round(computed.pct)}
        aria-valuetext={isUnknown ? 'No score yet' : computed.display}
      >
        <span className={trackClass} style={{ width: `${computed.pct}%` }} aria-hidden="true" />
      </div>
      <p className={styles.metricCardDescription}>{description}</p>
    </div>
  );
}
