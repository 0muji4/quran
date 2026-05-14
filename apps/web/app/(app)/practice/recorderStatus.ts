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
 */

export type RecorderStatusState = {
  recordingError: string | null;
  isScoringError: boolean;
  errorReasons: string[];
  isStuck: boolean;
  isAnalysing: boolean;
  isRecording: boolean;
};

export function recorderStatusMessage(s: RecorderStatusState): string {
  if (s.recordingError) return s.recordingError;
  if (s.isScoringError) {
    return s.errorReasons.length > 0
      ? `Could not score that recording. ${s.errorReasons.join('. ')}.`
      : 'Could not score that recording. Try recording again.';
  }
  if (s.isStuck) return 'Analysis is taking longer than usual.';
  if (s.isAnalysing) return 'Analysing your recitation. Please wait.';
  if (s.isRecording)
    return 'Recording in progress. Press the stop button to submit your recitation.';
  return 'The recorder is ready. Press the microphone button to start recording.';
}
