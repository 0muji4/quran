'use client';

import { useEffect, useRef, useState } from 'react';
import { fetchReferenceAudioUrl } from '../actions';

interface Props {
  surahId: number;
  ayahNumber: number;
  isRecording: boolean;
}

const PLAYBACK_RATES = [1, 0.75, 0.5] as const;
type PlaybackRate = (typeof PLAYBACK_RATES)[number];

export function TeacherAudio({ surahId, ayahNumber, isRecording }: Props) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [url, setUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [rate, setRate] = useState<PlaybackRate>(1);

  useEffect(() => {
    let cancelled = false;
    setUrl(null);
    setError(null);
    fetchReferenceAudioUrl(surahId, ayahNumber)
      .then((result) => {
        if (!cancelled) setUrl(result.url);
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'unavailable');
        }
      });
    return () => {
      cancelled = true;
    };
  }, [surahId, ayahNumber]);

  useEffect(() => {
    if (isRecording) {
      audioRef.current?.pause();
    }
  }, [isRecording]);

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.playbackRate = rate;
    }
  }, [rate, url]);

  if (error) {
    return (
      <div className="card">
        <p className="muted">Reference audio is currently unavailable.</p>
      </div>
    );
  }

  if (!url) {
    return (
      <div className="card">
        <p className="muted">Loading reference audio…</p>
      </div>
    );
  }

  return (
    <div className="card stack">
      <label htmlFor="teacher-audio-player">
        Listen to the teacher&apos;s recitation (Husary Mu&apos;allim)
      </label>
      <audio
        id="teacher-audio-player"
        key={`${surahId}-${ayahNumber}`}
        ref={audioRef}
        controls
        preload="none"
        src={url}
      />
      <label>
        Playback speed:{' '}
        <select
          value={rate}
          onChange={(event) => setRate(Number(event.target.value) as PlaybackRate)}
          disabled={isRecording}
        >
          {PLAYBACK_RATES.map((value) => (
            <option key={value} value={value}>
              {value.toFixed(2)}×
            </option>
          ))}
        </select>
      </label>
    </div>
  );
}
