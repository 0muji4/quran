'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

export const RECORDING_MIME_TYPE = 'audio/webm';
const LEVEL_BIN_COUNT = 32;
const TIMER_INTERVAL_MS = 200;

export type RecorderError = 'unsupported' | 'denied' | 'failed';

type State = {
  isRecording: boolean;
  elapsedMs: number;
  levels: number[];
  error: RecorderError | null;
};

type UseRecorderApi = State & {
  start: () => Promise<void>;
  stop: () => Promise<Blob | null>;
  cancel: () => void;
};

const initialLevels = (): number[] => Array.from({ length: LEVEL_BIN_COUNT }, () => 0);

export function useRecorder(): UseRecorderApi {
  const [state, setState] = useState<State>({
    isRecording: false,
    elapsedMs: 0,
    levels: initialLevels(),
    error: null
  });

  const recorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const rafRef = useRef<number | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startedAtRef = useRef<number | null>(null);
  const stopResolverRef = useRef<((blob: Blob | null) => void) | null>(null);

  const cleanup = useCallback(() => {
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    if (timerRef.current !== null) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    if (audioCtxRef.current) {
      void audioCtxRef.current.close().catch(() => {});
      audioCtxRef.current = null;
    }
    analyserRef.current = null;
    recorderRef.current = null;
    startedAtRef.current = null;
  }, []);

  useEffect(() => () => cleanup(), [cleanup]);

  const start = useCallback(async () => {
    setState({ isRecording: false, elapsedMs: 0, levels: initialLevels(), error: null });

    if (typeof window === 'undefined' || typeof MediaRecorder === 'undefined') {
      setState((prev) => ({ ...prev, error: 'unsupported' }));
      return;
    }
    if (!navigator.mediaDevices?.getUserMedia) {
      setState((prev) => ({ ...prev, error: 'unsupported' }));
      return;
    }

    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch {
      setState((prev) => ({ ...prev, error: 'denied' }));
      return;
    }

    try {
      streamRef.current = stream;

      const ctx = new (
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
      )();
      audioCtxRef.current = ctx;
      const source = ctx.createMediaStreamSource(stream);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 256;
      analyser.smoothingTimeConstant = 0.6;
      source.connect(analyser);
      analyserRef.current = analyser;

      const recorder = new MediaRecorder(stream, { mimeType: RECORDING_MIME_TYPE });
      chunksRef.current = [];
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };
      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: RECORDING_MIME_TYPE });
        const resolver = stopResolverRef.current;
        stopResolverRef.current = null;
        cleanup();
        setState({ isRecording: false, elapsedMs: 0, levels: initialLevels(), error: null });
        if (resolver) resolver(blob.size > 0 ? blob : null);
      };
      recorder.start();
      recorderRef.current = recorder;

      startedAtRef.current = performance.now();
      timerRef.current = setInterval(() => {
        if (startedAtRef.current === null) return;
        setState((prev) => ({
          ...prev,
          // Round at the source: `performance.now()` is sub-ms float
          // precision, but every downstream consumer treats the value
          // as integer milliseconds (UI clock, telemetry, the BFF
          // schema's `z.number().int()`). Keeping floats in the
          // hook's state has already cost one silent-failure outage
          // where the BFF rejected `4402.59…` with a 400 that the
          // fire-and-forget call swallowed.
          elapsedMs: Math.round(performance.now() - (startedAtRef.current ?? 0))
        }));
      }, TIMER_INTERVAL_MS);

      const buffer = new Uint8Array(analyser.frequencyBinCount);
      const tick = () => {
        const a = analyserRef.current;
        if (!a) return;
        a.getByteFrequencyData(buffer);
        // Downsample frequencyBinCount → LEVEL_BIN_COUNT.
        const stride = Math.max(1, Math.floor(buffer.length / LEVEL_BIN_COUNT));
        const next: number[] = new Array(LEVEL_BIN_COUNT).fill(0);
        for (let i = 0; i < LEVEL_BIN_COUNT; i += 1) {
          let sum = 0;
          let count = 0;
          for (let j = 0; j < stride; j += 1) {
            const idx = i * stride + j;
            if (idx < buffer.length) {
              sum += buffer[idx];
              count += 1;
            }
          }
          next[i] = count > 0 ? sum / count / 255 : 0;
        }
        setState((prev) => ({ ...prev, levels: next }));
        rafRef.current = requestAnimationFrame(tick);
      };
      rafRef.current = requestAnimationFrame(tick);

      setState((prev) => ({ ...prev, isRecording: true }));
    } catch {
      cleanup();
      setState({ isRecording: false, elapsedMs: 0, levels: initialLevels(), error: 'failed' });
    }
  }, [cleanup]);

  const stop = useCallback(async (): Promise<Blob | null> => {
    const recorder = recorderRef.current;
    if (!recorder || recorder.state === 'inactive') {
      cleanup();
      setState((prev) => ({ ...prev, isRecording: false }));
      return null;
    }
    return new Promise<Blob | null>((resolve) => {
      stopResolverRef.current = resolve;
      try {
        recorder.stop();
      } catch {
        cleanup();
        resolve(null);
      }
    });
  }, [cleanup]);

  const cancel = useCallback(() => {
    stopResolverRef.current = null;
    cleanup();
    setState({ isRecording: false, elapsedMs: 0, levels: initialLevels(), error: null });
  }, [cleanup]);

  return { ...state, start, stop, cancel };
}
