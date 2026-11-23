'use client';

import { useTranslations } from 'next-intl';
import { css, cx } from '../../../../../styled-system/css';
import { appCard } from '../../../../../styled-system/recipes';

type MetricKind = 'accuracy' | 'characterMatch' | 'completeness';

interface Props {
  kind: MetricKind;
  // 0..1 fraction (matches PronunciationFeedback.accuracy etc).
  value: number | null | undefined;
}

const toPercent = (v: number | null | undefined): { display: string; pct: number } => {
  if (typeof v !== 'number' || Number.isNaN(v)) {
    return { display: '—', pct: 0 };
  }
  const pct = Math.max(0, Math.min(100, v * 100));
  return { display: `${pct.toFixed(1)}%`, pct };
};

const cardClass = cx(
  appCard({ variant: 'filled' }),
  css({ display: 'flex', flexDirection: 'column', gap: '2', padding: '4' })
);

const headClass = css({
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'baseline',
  gap: '2'
});

const labelClass = css({ textStyle: 'titleMedium' });

const valueClass = css({ textStyle: 'titleMedium', color: 'primary' });

// A Material 3 linear progress: the indicator and the track with a gap
// between them.
const barClass = css({ display: 'flex', alignItems: 'center', gap: '1', height: '[4px]' });

const indicatorClass = css({
  flexShrink: 0,
  height: '[4px]',
  borderRadius: 'full',
  background: 'primary'
});

const trackClass = css({
  flexGrow: 1,
  height: '[4px]',
  borderRadius: 'full',
  background: 'secondaryContainer'
});

const descriptionClass = css({ margin: '0', textStyle: 'bodySmall', color: 'onSurfaceVariant' });

export function MetricCard({ kind, value }: Props) {
  const t = useTranslations('result.metric');
  const computed = toPercent(value);
  const labelId = `metric-${kind}`;
  const isUnknown = computed.display === '—';

  return (
    <div className={cardClass}>
      <div className={headClass}>
        <span id={labelId} className={labelClass}>
          {t(`${kind}.label`)}
        </span>
        <span className={valueClass} aria-hidden="true">
          {computed.display}
        </span>
      </div>
      <div
        className={barClass}
        role="progressbar"
        aria-labelledby={labelId}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={isUnknown ? undefined : Math.round(computed.pct)}
        aria-valuetext={isUnknown ? t('noScore') : computed.display}
      >
        {computed.pct > 0 ? (
          <span
            className={indicatorClass}
            style={{ width: `${computed.pct}%` }}
            aria-hidden="true"
          />
        ) : null}
        {computed.pct < 100 ? <span className={trackClass} aria-hidden="true" /> : null}
      </div>
      <p className={descriptionClass}>{t(`${kind}.description`)}</p>
    </div>
  );
}
