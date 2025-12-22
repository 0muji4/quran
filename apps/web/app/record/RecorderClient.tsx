'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { ScoreSegment, ScoringResult } from '@quran-project/shared-ts';
import { SegmentHighlights } from '@quran-project/ui';
import {
  createScoringJobFromUpload,
  fetchScoringJob,
  requestSignedUploadUrl
} from '../actions';
import { describeUploadTarget } from '../../src';

const recordingMimeType = 'audio/webm';

const statusLabel = (job?: ScoringResult | null): string | null => {
  if (!job) return null;
  if (job.status === 'COMPLETED') return job.verdict ?? 'Scoring complete';
  if (job.status === 'FAILED') return job.verdict ?? 'Scoring failed';
  if (job.status === 'RUNNING') return 'Scoring in progress...';
  return 'Job queued for scoring...';
};

const formatError = (error: unknown): string =>
  error instanceof Error ? error.message : 'Unexpected error';

export function RecorderClient() {
  const [isRecording, setIsRecording] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [uploadTarget, setUploadTarget] = useState<string | null>(null);
  const [job, setJob] = useState<ScoringResult | null>(null);
  const [segments, setSegments] = useState<ScoreSegment[]>([]);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [surahId, setSurahId] = useState('1');
  const [ayahNumber, setAyahNumber] = useState<string>('');
  const [transcript, setTranscript] = useState('');
  const [polling, setPolling] = useState(false);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const pollerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const clearPolling = useCallback(() => {
    if (pollerRef.current) {
      clearInterval(pollerRef.current);
      pollerRef.current = null;
    }
  }, []);

  useEffect(() => {
    return () => {
      clearPolling();
    };
  }, [clearPolling]);

  const resetJobState = useCallback(() => {
    clearPolling();
    setJob(null);
    setSegments([]);
    setStatus(null);
    setUploadTarget(null);
    setError(null);
    setPolling(false);
    setAudioUrl((previous) => {
      if (previous) URL.revokeObjectURL(previous);
      return null;
    });
  }, [clearPolling]);

  const startPolling = useCallback(
    (jobId: string) => {
      clearPolling();
      setPolling(true);
      const poll = async () => {
        try {
          const result = await fetchScoringJob(jobId);
          setJob(result);
          setSegments(result.segments);

          if (result.status === 'COMPLETED' || result.status === 'FAILED') {
            setPolling(false);
            clearPolling();
            setStatus(statusLabel(result));
          }
        } catch (pollError) {
          setError(formatError(pollError));
          setPolling(false);
          clearPolling();
        }
      };

      void poll();
      pollerRef.current = setInterval(() => void poll(), 2000);
    },
    [clearPolling]
  );

  const uploadRecording = useCallback(
    async (blob: Blob) => {
      setError(null);
      setStatus('Requesting signed upload URL...');
      setIsUploading(true);

      try {
        const upload = await requestSignedUploadUrl({
          filename: `recording-${Date.now()}.webm`,
          contentType: blob.type || recordingMimeType
        });

        const uploadKey =
          upload.uploadKey ??
          (upload.fields && typeof upload.fields === 'object'
            ? (upload.fields as Record<string, unknown>).key
            : undefined);

        if (!uploadKey || typeof uploadKey !== 'string') {
          throw new Error('Upload key missing from signed URL response');
        }

        setUploadTarget(describeUploadTarget(upload));
        setStatus('Uploading audio...');

        const uploadResponse = await fetch(upload.url, {
          method: 'PUT',
          body: blob,
          headers: {
            'Content-Type': blob.type || recordingMimeType
          }
        });

        if (!uploadResponse.ok) {
          throw new Error(`Upload failed with status ${uploadResponse.status}`);
        }

        setStatus('Creating scoring job...');

        const result = await createScoringJobFromUpload({
          uploadKey,
          surahId,
          ayahNumber: ayahNumber ? Number(ayahNumber) : undefined,
          transcript: transcript.trim() || undefined
        });

        setJob(result);
        setSegments(result.segments);
        setStatus(statusLabel(result));
        startPolling(result.jobId);
      } catch (uploadError) {
        setError(formatError(uploadError));
      } finally {
        setIsUploading(false);
      }
    },
    [ayahNumber, startPolling, surahId, transcript]
  );

  const handleStop = useCallback(() => {
    const recorder = mediaRecorderRef.current;
    if (!recorder) return;

    recorder.stop();
    recorder.stream.getTracks().forEach((track) => track.stop());
    setIsRecording(false);
  }, []);

  const handleRecord = useCallback(async () => {
    resetJobState();

    if (typeof window === 'undefined' || typeof MediaRecorder === 'undefined') {
      setError('MediaRecorder is not supported in this environment');
      return;
    }

    if (!navigator.mediaDevices?.getUserMedia) {
      setError('Microphone access is unavailable in this browser');
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream, { mimeType: recordingMimeType });
      chunksRef.current = [];

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: recordingMimeType });
        const previewUrl = URL.createObjectURL(blob);
        setAudioUrl((previous) => {
          if (previous) URL.revokeObjectURL(previous);
          return previewUrl;
        });
        void uploadRecording(blob);
      };

      recorder.start();
      mediaRecorderRef.current = recorder;
      setIsRecording(true);
      setStatus('Recording...');
    } catch (recordError) {
      setError(formatError(recordError));
      setIsRecording(false);
    }
  }, [resetJobState, uploadRecording]);

  const disabled = isRecording || isUploading;

  return (
    <div className="card stack">
      <div className="inputs">
        <label>
          Surah ID
          <input
            value={surahId}
            onChange={(event) => setSurahId(event.target.value)}
            placeholder="e.g. 1"
          />
        </label>
        <label>
          Ayah number (optional)
          <input
            type="number"
            value={ayahNumber}
            onChange={(event) => setAyahNumber(event.target.value)}
            placeholder="e.g. 2"
          />
        </label>
        <label>
          Transcript or notes (optional)
          <textarea
            rows={3}
            value={transcript}
            onChange={(event) => setTranscript(event.target.value)}
            placeholder="Share any context that helps the scorer"
          />
        </label>
      </div>

      <div className="controls">
        <button
          type="button"
          className="primary"
          onClick={isRecording ? handleStop : handleRecord}
          disabled={isUploading}
        >
          {isRecording ? 'Stop recording' : 'Start recording'}
        </button>
        <button
          type="button"
          className="secondary"
          onClick={() => {
            handleStop();
            resetJobState();
          }}
          disabled={disabled}
        >
          Reset
        </button>
      </div>

      {status && <div className="status">{status}</div>}
      {uploadTarget && <div className="status">Signed URL: {uploadTarget}</div>}
      {error && <div className="status error">Error: {error}</div>}

      {audioUrl && (
        <div className="stack">
          <p className="pill warn">Preview of your last recording</p>
          <audio controls src={audioUrl} />
        </div>
      )}

      {job && (
        <div className="stack">
          <div className="pill success">
            <span>Job</span>
            <strong>{job.jobId}</strong>
          </div>
          <div className="status">
            <strong>Status:</strong> {job.status}
            {job.verdict ? ` — ${job.verdict}` : null}
          </div>
          {job.score !== null && job.score !== undefined && (
            <p>
              Overall score: <strong>{(job.score * 100).toFixed(1)}%</strong>
            </p>
          )}
          {polling && <p>Polling for updates…</p>}
        </div>
      )}

      {segments.length > 0 && (
        <>
          <div className="divider" />
          <div className="stack">
            <h3>Segment highlights</h3>
            <SegmentHighlights segments={segments} threshold={0.85} />
          </div>
        </>
      )}
    </div>
  );
}
