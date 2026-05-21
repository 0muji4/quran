'use client';

import { useCallback, useEffect, useRef, useState, type RefObject } from 'react';
import { fetchReferenceAudioUrl } from '../actions';

export type PlaybackRate = 0.75 | 1 | 1.25;

interface State {
  url: string | null;
  loading: boolean;
  error: string | null;
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  rate: PlaybackRate;
  loop: boolean;
}

type UseTeacherAudioApi = State & {
  audioRef: RefObject<HTMLAudioElement>;
  togglePlay: () => void;
  setRate: (rate: PlaybackRate) => void;
  toggleLoop: () => void;
  pause: () => void;
};

export function useTeacherAudio(surahId: number, ayahNumber: number): UseTeacherAudioApi {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [state, setState] = useState<State>({
    url: null,
    loading: true,
    error: null,
    isPlaying: false,
    currentTime: 0,
    duration: 0,
    rate: 1,
    loop: false
  });

  // Reset & fetch when ayah changes.
  useEffect(() => {
    let cancelled = false;
    setState((prev) => ({
      ...prev,
      url: null,
      loading: true,
      error: null,
      currentTime: 0,
      isPlaying: false
    }));

    fetchReferenceAudioUrl(surahId, ayahNumber)
      .then((res) => {
        if (cancelled) return;
        setState((prev) => ({ ...prev, url: res.url, loading: false }));
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setState((prev) => ({
          ...prev,
          loading: false,
          error: err instanceof Error ? err.message : 'unavailable'
        }));
      });

    return () => {
      cancelled = true;
    };
  }, [surahId, ayahNumber]);

  // Apply rate to the element.
  useEffect(() => {
    const a = audioRef.current;
    if (a) a.playbackRate = state.rate;
  }, [state.rate, state.url]);

  // Wire DOM events to state.
  useEffect(() => {
    const a = audioRef.current;
    if (!a) return undefined;

    const handleTime = () => {
      setState((prev) => ({
        ...prev,
        currentTime: a.currentTime,
        duration: Number.isFinite(a.duration) ? a.duration : prev.duration
      }));
    };
    const handleLoaded = () => {
      setState((prev) => ({
        ...prev,
        duration: Number.isFinite(a.duration) ? a.duration : prev.duration
      }));
    };
    const handlePlay = () => setState((prev) => ({ ...prev, isPlaying: true }));
    const handlePause = () => setState((prev) => ({ ...prev, isPlaying: false }));
    const handleEnded = () => {
      // Manual loop so we can later add a small inter-loop gap if needed.
      setState((prev) => {
        if (prev.loop && a) {
          a.currentTime = 0;
          void a.play().catch(() => {
            /* user gesture lost */
          });
          return { ...prev, currentTime: 0, isPlaying: true };
        }
        return { ...prev, isPlaying: false, currentTime: a.duration ?? prev.currentTime };
      });
    };

    a.addEventListener('timeupdate', handleTime);
    a.addEventListener('loadedmetadata', handleLoaded);
    a.addEventListener('play', handlePlay);
    a.addEventListener('pause', handlePause);
    a.addEventListener('ended', handleEnded);

    return () => {
      a.removeEventListener('timeupdate', handleTime);
      a.removeEventListener('loadedmetadata', handleLoaded);
      a.removeEventListener('play', handlePlay);
      a.removeEventListener('pause', handlePause);
      a.removeEventListener('ended', handleEnded);
    };
  }, [state.url]);

  const togglePlay = useCallback(() => {
    const a = audioRef.current;
    if (!a) return;
    if (a.paused) {
      void a.play().catch(() => {
        /* ignore */
      });
    } else {
      a.pause();
    }
  }, []);

  const pause = useCallback(() => {
    audioRef.current?.pause();
  }, []);

  const setRate = useCallback((rate: PlaybackRate) => {
    setState((prev) => ({ ...prev, rate }));
  }, []);

  const toggleLoop = useCallback(() => {
    setState((prev) => ({ ...prev, loop: !prev.loop }));
  }, []);

  return {
    ...state,
    audioRef,
    togglePlay,
    pause,
    setRate,
    toggleLoop
  };
}
