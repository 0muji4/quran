'use client';

import { MicIcon } from '../../components/icons/MediaIcons';
import { ArrowRightIcon } from '../../components/icons/ArrowRightIcon';
import styles from '../../styles/practice.module.css';

type Props = {
  reasons: string[];
  hint?: string;
  canReplay: boolean;
  onReplay?: () => void;
  onRecordAgain: () => void;
};

const DEFAULT_HINT = 'Move closer to the microphone and try again';

// Inset body of the "could not score" panel (docs/4b. Practice _ error
// _could not score_.png). The surrounding panel head (red mic icon, title,
// "COULDN'T PROCESS" badge) lives in RecorderPanel; this component owns
// only the dashed mic, reasons list, hint copy, and the two CTAs.
export function ScoringErrorCard({
  reasons,
  hint = DEFAULT_HINT,
  canReplay,
  onReplay,
  onRecordAgain
}: Props) {
  return (
    <div className={styles.scoringErrorCard} role="alert">
      <span className={styles.scoringErrorMic} aria-hidden="true">
        <MicIcon size={22} />
      </span>

      {reasons.length > 0 ? (
        <ul className={styles.scoringErrorReasons}>
          {reasons.map((reason, i) => (
            <li key={i} className={styles.scoringErrorReason}>
              {reason}
            </li>
          ))}
        </ul>
      ) : null}

      <p className={styles.scoringErrorHint}>{hint}</p>

      <div className={styles.scoringErrorActions}>
        {canReplay ? (
          <button
            type="button"
            className={`${styles.btnGhost} ${styles.scoringErrorReplay}`}
            onClick={onReplay}
          >
            <PlayGlyph /> Replay your recording
          </button>
        ) : null}
        <button
          type="button"
          className={`${styles.btnTeal} ${styles.scoringErrorPrimary}`}
          onClick={onRecordAgain}
        >
          <ArrowRightIcon size={14} /> Record again
        </button>
      </div>
    </div>
  );
}

function PlayGlyph() {
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" fill="currentColor" aria-hidden="true">
      <path d="M3 2 L10 6 L3 10 Z" />
    </svg>
  );
}
