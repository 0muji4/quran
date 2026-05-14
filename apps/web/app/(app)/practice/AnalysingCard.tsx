'use client';

import styles from '../../styles/practice.module.css';
import { RecorderBars } from './RecorderBars';

// Time-based step progression. The BFF only exposes QUEUED / RUNNING /
// COMPLETED so we cannot drive the checklist off real status. Instead the
// three checklist labels advance on a soft timer that matches the average
// scoring latency — purely for visual feedback that "things are happening".
const COMPARING_THRESHOLD_MS = 4_000;
const CALCULATING_THRESHOLD_MS = 8_000;

type StepStatus = 'pending' | 'active' | 'done';

const transcribingStatus = (elapsedMs: number): StepStatus =>
  elapsedMs < COMPARING_THRESHOLD_MS ? 'active' : 'done';

const comparingStatus = (elapsedMs: number): StepStatus => {
  if (elapsedMs < COMPARING_THRESHOLD_MS) return 'pending';
  if (elapsedMs < CALCULATING_THRESHOLD_MS) return 'active';
  return 'done';
};

const calculatingStatus = (elapsedMs: number): StepStatus =>
  elapsedMs < CALCULATING_THRESHOLD_MS ? 'pending' : 'active';

type Props = {
  elapsedMs: number;
};

export function AnalysingCard({ elapsedMs }: Props) {
  return (
    <div className={styles.analysingCard} aria-live="polite" aria-busy="true">
      <div className={styles.analysingWaveform}>
        <RecorderBars mode="analysing" />
      </div>
      <ul className={styles.analysingChecklist}>
        <ChecklistItem status={transcribingStatus(elapsedMs)} label="Transcribing audio" />
        <ChecklistItem status={comparingStatus(elapsedMs)} label="Comparing to reference" />
        <ChecklistItem status={calculatingStatus(elapsedMs)} label="Calculating your score" />
      </ul>
      <p className={styles.analysingFooter}>This usually takes a few seconds</p>
    </div>
  );
}

function ChecklistItem({ status, label }: { status: StepStatus; label: string }) {
  const itemClass =
    status === 'done'
      ? `${styles.checklistItem} ${styles.checklistItemDone}`
      : status === 'active'
        ? `${styles.checklistItem} ${styles.checklistItemActive}`
        : `${styles.checklistItem} ${styles.checklistItemPending}`;
  return (
    <li className={itemClass}>
      <span className={styles.checklistMarker} aria-hidden="true">
        {status === 'done' ? <CheckGlyph /> : null}
      </span>
      <span>{label}</span>
    </li>
  );
}

function CheckGlyph() {
  return (
    <svg width="10" height="10" viewBox="0 0 12 12" fill="none" aria-hidden="true">
      <path
        d="M2.5 6.2 5 8.5l4.5-5"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
