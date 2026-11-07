import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';
import { act, cleanup, renderHook, waitFor } from '@testing-library/react';
import { useTeacherAudio } from '../useTeacherAudio';

const fetchReferenceAudioUrlMock = vi.hoisted(() => vi.fn());

vi.mock('../../actions', () => ({
  fetchReferenceAudioUrl: fetchReferenceAudioUrlMock
}));

const renderAudio = () =>
  renderHook(({ ayah }: { ayah: number }) => useTeacherAudio(1, ayah), {
    initialProps: { ayah: 1 }
  });

beforeEach(() => {
  fetchReferenceAudioUrlMock.mockImplementation(async (surahId: number, ayah: number) => ({
    url: `https://audio.test/${surahId}/${ayah}.mp3`
  }));
});

afterEach(() => {
  cleanup();
  fetchReferenceAudioUrlMock.mockReset();
});

describe('useTeacherAudio', () => {
  it('fetches the reference audio on mount', async () => {
    const { result } = renderAudio();
    expect(result.current.loading).toBe(true);

    await waitFor(() => expect(result.current.url).toBe('https://audio.test/1/1.mp3'));
    expect(result.current.loading).toBe(false);
    expect(fetchReferenceAudioUrlMock).toHaveBeenCalledTimes(1);
  });

  it('resets playback but keeps rate and loop when the ayah changes', async () => {
    const { result, rerender } = renderAudio();
    await waitFor(() => expect(result.current.loading).toBe(false));
    act(() => {
      result.current.setRate(1.25);
      result.current.toggleLoop();
    });

    rerender({ ayah: 2 });

    expect(result.current.url).toBeNull();
    expect(result.current.loading).toBe(true);
    await waitFor(() => expect(result.current.url).toBe('https://audio.test/1/2.mp3'));
    expect(result.current.rate).toBe(1.25);
    expect(result.current.loop).toBe(true);
    expect(fetchReferenceAudioUrlMock).toHaveBeenCalledTimes(2);
  });

  it('clears a previous error when the ayah changes', async () => {
    fetchReferenceAudioUrlMock.mockRejectedValueOnce(new Error('offline'));
    const { result, rerender } = renderAudio();
    await waitFor(() => expect(result.current.error).toBe('offline'));

    rerender({ ayah: 2 });

    expect(result.current.error).toBeNull();
    await waitFor(() => expect(result.current.url).toBe('https://audio.test/1/2.mp3'));
  });

  it('ignores a response for an ayah the user has left', async () => {
    let resolveFirst: (value: { url: string }) => void = () => {};
    fetchReferenceAudioUrlMock.mockImplementationOnce(
      () => new Promise((resolve) => (resolveFirst = resolve))
    );
    const { result, rerender } = renderAudio();

    rerender({ ayah: 2 });
    await waitFor(() => expect(result.current.url).toBe('https://audio.test/1/2.mp3'));

    await act(async () => resolveFirst({ url: 'https://audio.test/stale.mp3' }));
    expect(result.current.url).toBe('https://audio.test/1/2.mp3');
  });
});
