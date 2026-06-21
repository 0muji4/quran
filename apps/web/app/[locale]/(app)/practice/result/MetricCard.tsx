'use client';

import { useTranslations } from 'next-intl';
import styles from '../../../../styles/practice.module.css';

type MetricKind = 'accuracy' | 'fluency' | 'completeness';

interface Props {
  kind: MetricKind;
  // 0..1 fraction (matches PronunciationFeedback.accuracy etc).
  value: number | null | undefined;
  tone?: 'amber' | 'red' | 'green';
}

const toPercent = (
  v: number | null | undefined
): { display: string; pct: number; tone: Props['tone'] } => {
  if (typeof v !== 'number' || Number.isNaN(v)) {
    return { display: '—', pct: 0, tone: 'red' };
  }
  const pct = Math.max(0, Math.min(100, v * 100));
  let tone: Props['tone'] = 'red';
  if (pct >= 80) tone = 'green';
  else if (pct >= 50) tone = 'amber';
  return { display: `${pct.toFixed(1)}%`, pct, tone };
};

export function MetricCard({ kind, value, tone }: Props) {
  const t = useTranslations('result.metric');
  const computed = toPercent(value);
  const effectiveTone = tone ?? computed.tone;
  const trackClass =
    effectiveTone === 'green'
      ? styles.metricBarFillGreen
      : effectiveTone === 'amber'
        ? styles.metricBarFillAmber
        : styles.metricBarFillRed;

  const labelId = `metric-${kind}`;
  const isUnknown = computed.display === '—';

  return (
    <div className={styles.metricCard}>
      <div className={styles.metricCardHead}>
        <span id={labelId} className={styles.metricCardLabel}>
          {t(`${kind}.label`)}
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
        aria-valuetext={isUnknown ? t('noScore') : computed.display}
      >
        <span className={trackClass} style={{ width: `${computed.pct}%` }} aria-hidden="true" />
      </div>
      <p className={styles.metricCardDescription}>{t(`${kind}.description`)}</p>
    </div>
  );
}
