'use client';

import { useTranslations } from 'next-intl';
import { css } from '../../../../styled-system/css';
import { appProgress } from '../../../../styled-system/recipes';

// Time-based step progression. The BFF only exposes QUEUED / RUNNING /
// COMPLETED so we cannot drive the checklist off real status. Instead the
// three checklist labels advance on a soft timer that matches the average
// scoring latency — purely for visual feedback that "things are happening".
const COMPARING_THRESHOLD_MS = 4_000;
const CALCULATING_THRESHOLD_MS = 8_000;

type StepStatus = 'pending' | 'active' | 'done';

const STEP_WEIGHT: Record<StepStatus, number> = { pending: 0, active: 0.5, done: 1 };

const transcribingStatus = (elapsedMs: number): StepStatus =>
  elapsedMs < COMPARING_THRESHOLD_MS ? 'active' : 'done';

const comparingStatus = (elapsedMs: number): StepStatus => {
  if (elapsedMs < COMPARING_THRESHOLD_MS) return 'pending';
  if (elapsedMs < CALCULATING_THRESHOLD_MS) return 'active';
  return 'done';
};

const calculatingStatus = (elapsedMs: number): StepStatus =>
  elapsedMs < CALCULATING_THRESHOLD_MS ? 'pending' : 'active';

const cardClass = css({ display: 'flex', flexDirection: 'column', gap: '1', paddingTop: '2' });

const listClass = css({ listStyle: 'none', margin: '0', padding: '0' });

const itemClass = css({
  display: 'flex',
  alignItems: 'center',
  gap: '3',
  minHeight: '[40px]',
  textStyle: 'bodyLarge',
  color: 'onSurface',
  '&[data-status=pending]': { color: 'onSurfaceVariant' }
});

const markerClass = css({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  flexShrink: 0,
  width: '[24px]',
  height: '[24px]'
});

const doneClass = css({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  width: '[22px]',
  height: '[22px]',
  borderRadius: 'full',
  background: 'pass',
  color: 'onPass'
});

const pendingClass = css({
  width: '[20px]',
  height: '[20px]',
  borderRadius: 'full',
  borderWidth: '2px',
  borderStyle: 'solid',
  borderColor: 'outline'
});

const spinnerClass = css({
  color: 'primary',
  animation: '[appSpin 1s linear infinite]',
  _motionReduce: { animation: 'none' }
});

const footerClass = css({
  margin: '0',
  paddingTop: '2',
  textStyle: 'bodySmall',
  color: 'onSurfaceVariant'
});

interface Props {
  elapsedMs: number;
}

export function AnalysingCard({ elapsedMs }: Props) {
  const t = useTranslations('practice.analysing');
  const steps: Array<[StepStatus, string]> = [
    [transcribingStatus(elapsedMs), t('transcribing')],
    [comparingStatus(elapsedMs), t('comparing')],
    [calculatingStatus(elapsedMs), t('calculating')]
  ];
  // Done steps count fully and the active one half, so the bar moves as the
  // checklist does.
  const progress = steps.reduce((sum, [status]) => sum + STEP_WEIGHT[status], 0);
  return (
    <div className={cardClass} aria-busy="true">
      <ul className={listClass}>
        {steps.map(([status, label]) => (
          <li key={label} className={itemClass} data-status={status}>
            <span className={markerClass} aria-hidden="true">
              <StepMarker status={status} />
            </span>
            <span>{label}</span>
          </li>
        ))}
      </ul>
      <progress className={appProgress()} value={progress} max={steps.length} aria-hidden="true" />
      <p className={footerClass}>{t('footer')}</p>
    </div>
  );
}

function StepMarker({ status }: { status: StepStatus }) {
  if (status === 'done') {
    return (
      <span className={doneClass}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path
            d="M5 12l5 5 10-10"
            stroke="currentColor"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </span>
    );
  }
  if (status === 'active') {
    // A Material 3 circular progress indicator.
    return (
      <svg className={spinnerClass} width="24" height="24" viewBox="0 0 24 24" aria-hidden="true">
        <circle
          cx="12"
          cy="12"
          r="9"
          fill="none"
          stroke="currentColor"
          strokeWidth="3"
          strokeLinecap="round"
          strokeDasharray="20 100"
        />
      </svg>
    );
  }
  return <span className={pendingClass} />;
}
