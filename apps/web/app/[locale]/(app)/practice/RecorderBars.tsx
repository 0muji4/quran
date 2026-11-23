'use client';

import { css } from '../../../../styled-system/css';

// Shown until the first microphone levels arrive.
const IDLE_HEIGHTS = [
  0.18, 0.32, 0.5, 0.34, 0.22, 0.4, 0.62, 0.48, 0.28, 0.36, 0.5, 0.66, 0.7, 0.52, 0.34, 0.42, 0.58,
  0.66, 0.5, 0.36, 0.22, 0.32, 0.46, 0.6, 0.52, 0.38, 0.24, 0.34
];

const barsClass = css({
  display: 'flex',
  alignItems: 'center',
  gap: '[3px]',
  height: '[48px]'
});

const barClass = css({
  width: '[4px]',
  borderRadius: 'full',
  background: 'recording',
  transition: '[height 0.08s linear]',
  _motionReduce: { transition: '[none]' }
});

interface Props {
  // Live microphone levels, each from 0 to 1.
  levels?: number[];
}

// The recording waveform: one bar per recent microphone level.
export function RecorderBars({ levels }: Props) {
  const data = levels && levels.length > 0 ? levels : IDLE_HEIGHTS;
  return (
    <div className={barsClass} aria-hidden="true" data-testid="recording-waveform">
      {data.map((value, i) => {
        const heightPct = Math.max(8, Math.min(100, Math.round(value * 100)));
        return <span key={i} className={barClass} style={{ height: `${heightPct}%` }} />;
      })}
    </div>
  );
}
