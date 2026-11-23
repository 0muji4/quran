'use client';

import { useTranslations } from 'next-intl';
import { css } from '../../../../../styled-system/css';

interface Props {
  score: number | null;
}

// The arc is drawn in a 120-unit box and scaled to the dial's size.
const VIEW = 120;
const STROKE = 8;
const RADIUS = 52;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

const dialClass = css({
  position: 'relative',
  flexShrink: 0,
  width: '[112px]',
  height: '[112px]',
  medium: { width: '[144px]', height: '[144px]' }
});

const svgClass = css({ display: 'block', width: '[100%]', height: '[100%]' });

const trackClass = css({ stroke: 'secondaryContainer' });

const indicatorClass = css({ stroke: 'primary' });

const centerClass = css({
  position: 'absolute',
  inset: '0',
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center'
});

const numberClass = css({
  textStyle: 'displaySmall',
  lineHeight: '[1]',
  medium: { textStyle: 'displayMedium', lineHeight: '[1]' }
});

const unitClass = css({ marginTop: '[2px]', textStyle: 'bodySmall', color: 'onSurfaceVariant' });

// The score as a Material 3 circular progress indicator: 0–100 fills the
// circle clockwise from 12 o'clock. `'use client'` only because
// `useTranslations` is a client hook; the component itself has no state.
export function ScoreDial({ score }: Props) {
  const t = useTranslations('result.score');
  const known = score !== null && !Number.isNaN(score);
  const display = known ? Math.round(score).toString() : '—';
  const fraction = known ? Math.max(0, Math.min(100, score)) / 100 : 0;
  const ariaLabel = known ? t('withScore', { score: Math.round(score) }) : t('noScore');
  const centre = VIEW / 2;

  return (
    <div className={dialClass} role="img" aria-label={ariaLabel}>
      <svg className={svgClass} viewBox={`0 0 ${VIEW} ${VIEW}`} aria-hidden="true">
        <circle
          cx={centre}
          cy={centre}
          r={RADIUS}
          className={trackClass}
          strokeWidth={STROKE}
          fill="none"
        />
        {fraction > 0 ? (
          <circle
            cx={centre}
            cy={centre}
            r={RADIUS}
            className={indicatorClass}
            strokeWidth={STROKE}
            fill="none"
            strokeLinecap="round"
            strokeDasharray={`${CIRCUMFERENCE * fraction} ${CIRCUMFERENCE}`}
            transform={`rotate(-90 ${centre} ${centre})`}
          />
        ) : null}
      </svg>
      <div className={centerClass} aria-hidden="true">
        <span className={numberClass}>{display}</span>
        <span className={unitClass}>{t('outOf100')}</span>
      </div>
    </div>
  );
}
