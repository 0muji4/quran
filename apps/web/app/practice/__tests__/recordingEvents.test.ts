import { afterEach, describe, expect, it, vi } from 'vitest';
import { notifyRecordingStarted, onRecordingStarted } from '../recordingEvents';

describe('recordingEvents', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('invokes subscribed handlers when notify fires', () => {
    const handler = vi.fn();
    const unsubscribe = onRecordingStarted(handler);

    notifyRecordingStarted();
    notifyRecordingStarted();

    expect(handler).toHaveBeenCalledTimes(2);
    unsubscribe();
  });

  it('stops invoking after the returned unsubscribe runs', () => {
    const handler = vi.fn();
    const unsubscribe = onRecordingStarted(handler);

    notifyRecordingStarted();
    unsubscribe();
    notifyRecordingStarted();

    expect(handler).toHaveBeenCalledTimes(1);
  });

  it('fans out to multiple subscribers independently', () => {
    const a = vi.fn();
    const b = vi.fn();
    const unA = onRecordingStarted(a);
    const unB = onRecordingStarted(b);

    notifyRecordingStarted();

    expect(a).toHaveBeenCalledTimes(1);
    expect(b).toHaveBeenCalledTimes(1);

    unA();
    notifyRecordingStarted();

    expect(a).toHaveBeenCalledTimes(1);
    expect(b).toHaveBeenCalledTimes(2);
    unB();
  });
});
