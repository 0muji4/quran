/**
 * Pure mapping from RecorderPanel runtime state to a single human sentence
 * announced via the panel's `role="status" aria-live="polite"` region.
 *
 * Phase 2.3-B (docs/web-tilawah-followups.md) — without this, the recorder
 * state machine (idle → recording → uploading → scoring → done / error)
 * is invisible to screen readers because the visible affordances change
 * heading text and icon glyphs but never trigger an assertive announcement.
 *
 * Order is significant. recordingError (mic permission, unsupported
 * browser) outranks every other state because the remediation is
 * different from "try a fresh recording".
 *
 * The wording deliberately avoids the visible "tap the mic to begin"
 * and "tap to stop and submit" caption phrases, so e2e locators that
 * target those captions via getByText() do not match the hidden
 * status region in addition to the visible <p> caption.
 *
 * Strings are resolved via the `t` callback so callers (RecorderPanel,
 * tests) can plug in `useTranslations('practice.recorder.liveStatus')`
 * or a stub that returns keys verbatim. Keeping the function pure means
 * it stays testable without a React provider tree.
 */

export interface RecorderStatusState {
  recordingError: string | null;
  isScoringError: boolean;
  errorReasons: string[];
  isStuck: boolean;
  isAnalysing: boolean;
  isRecording: boolean;
}

export type RecorderStatusTranslator = (
  key:
    | 'idle'
    | 'recording'
    | 'analysing'
    | 'stuck'
    | 'scoringErrorGeneric'
    | 'scoringErrorWithReasons',
  values?: { reasons: string }
) => string;

export function recorderStatusMessage(s: RecorderStatusState, t: RecorderStatusTranslator): string {
  if (s.recordingError) return s.recordingError;
  if (s.isScoringError) {
    return s.errorReasons.length > 0
      ? t('scoringErrorWithReasons', { reasons: s.errorReasons.join('. ') })
      : t('scoringErrorGeneric');
  }
  if (s.isStuck) return t('stuck');
  if (s.isAnalysing) return t('analysing');
  if (s.isRecording) return t('recording');
  return t('idle');
}
