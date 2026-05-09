import { describe, expect, it } from 'vitest';
import { recorderStatusMessage, type RecorderStatusState } from '../recorderStatus';

const baseState: RecorderStatusState = {
  recordingError: null,
  isScoringError: false,
  errorReasons: [],
  isStuck: false,
  isAnalysing: false,
  isRecording: false
};

describe('recorderStatusMessage', () => {
  it('returns the idle prompt when nothing is happening', () => {
    expect(recorderStatusMessage(baseState)).toBe('Ready to record. Tap the mic to begin.');
  });

  it('announces the recording state', () => {
    expect(recorderStatusMessage({ ...baseState, isRecording: true })).toBe(
      'Recording. Tap the mic to stop and submit.'
    );
  });

  it('announces the analysing state', () => {
    expect(recorderStatusMessage({ ...baseState, isAnalysing: true })).toBe(
      'Analysing your recitation. Please wait.'
    );
  });

  it('announces the stuck variant when analysis takes too long', () => {
    expect(recorderStatusMessage({ ...baseState, isAnalysing: true, isStuck: true })).toBe(
      'Analysis is taking longer than usual.'
    );
  });

  it('joins error reasons into the scoring-error announcement', () => {
    expect(
      recorderStatusMessage({
        ...baseState,
        isScoringError: true,
        errorReasons: ['Recording was 0.6 s — too short to score']
      })
    ).toBe('Could not score that recording. Recording was 0.6 s — too short to score.');
  });

  it('falls back to a generic scoring-error announcement when no reasons are given', () => {
    expect(recorderStatusMessage({ ...baseState, isScoringError: true })).toBe(
      'Could not score that recording. Try recording again.'
    );
  });

  it('surfaces a recording error verbatim', () => {
    expect(
      recorderStatusMessage({
        ...baseState,
        recordingError: 'Microphone access was denied.'
      })
    ).toBe('Microphone access was denied.');
  });

  it('prefers recordingError over every other state', () => {
    expect(
      recorderStatusMessage({
        ...baseState,
        recordingError: 'Microphone access was denied.',
        isRecording: true,
        isAnalysing: true
      })
    ).toBe('Microphone access was denied.');
  });
});
