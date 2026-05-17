import { describe, expect, it } from 'vitest';
import {
  recorderStatusMessage,
  type RecorderStatusState,
  type RecorderStatusTranslator
} from '../recorderStatus';

const baseState: RecorderStatusState = {
  recordingError: null,
  isScoringError: false,
  errorReasons: [],
  isStuck: false,
  isAnalysing: false,
  isRecording: false
};

// Mirrors the practice.recorder.liveStatus block in messages/en.json. Kept
// inline so this unit test stays free of NextIntlClientProvider plumbing
// and matches the function's contract exactly (key + ICU interpolation).
const en: Record<Parameters<RecorderStatusTranslator>[0], string> = {
  idle: 'The recorder is ready. Press the microphone button to start recording.',
  recording: 'Recording in progress. Press the stop button to submit your recitation.',
  analysing: 'Analysing your recitation. Please wait.',
  stuck: 'Analysis is taking longer than usual.',
  scoringErrorGeneric: 'Could not score that recording. Try recording again.',
  scoringErrorWithReasons: 'Could not score that recording. {reasons}.'
};

const t: RecorderStatusTranslator = (key, values) => {
  const template = en[key];
  if (!values) return template;
  return Object.entries(values).reduce<string>(
    (acc, [k, v]) => acc.replace(`{${k}}`, String(v)),
    template
  );
};

describe('recorderStatusMessage', () => {
  it('returns the idle prompt when nothing is happening', () => {
    expect(recorderStatusMessage(baseState, t)).toBe(
      'The recorder is ready. Press the microphone button to start recording.'
    );
  });

  it('announces the recording state', () => {
    expect(recorderStatusMessage({ ...baseState, isRecording: true }, t)).toBe(
      'Recording in progress. Press the stop button to submit your recitation.'
    );
  });

  it('announces the analysing state', () => {
    expect(recorderStatusMessage({ ...baseState, isAnalysing: true }, t)).toBe(
      'Analysing your recitation. Please wait.'
    );
  });

  it('announces the stuck variant when analysis takes too long', () => {
    expect(recorderStatusMessage({ ...baseState, isAnalysing: true, isStuck: true }, t)).toBe(
      'Analysis is taking longer than usual.'
    );
  });

  it('joins error reasons into the scoring-error announcement', () => {
    expect(
      recorderStatusMessage(
        {
          ...baseState,
          isScoringError: true,
          errorReasons: ['Recording was 0.6 s — too short to score']
        },
        t
      )
    ).toBe('Could not score that recording. Recording was 0.6 s — too short to score.');
  });

  it('falls back to a generic scoring-error announcement when no reasons are given', () => {
    expect(recorderStatusMessage({ ...baseState, isScoringError: true }, t)).toBe(
      'Could not score that recording. Try recording again.'
    );
  });

  it('surfaces a recording error verbatim', () => {
    expect(
      recorderStatusMessage(
        {
          ...baseState,
          recordingError: 'Microphone access was denied.'
        },
        t
      )
    ).toBe('Microphone access was denied.');
  });

  it('prefers recordingError over every other state', () => {
    expect(
      recorderStatusMessage(
        {
          ...baseState,
          recordingError: 'Microphone access was denied.',
          isRecording: true,
          isAnalysing: true
        },
        t
      )
    ).toBe('Microphone access was denied.');
  });
});
