'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { ScoreSegment, ScoringResult } from '@quran-project/shared-ts';
import { createScoringJobFromUpload, fetchScoringJob, requestSignedUploadUrl } from '../actions';
import { RECORDING_MIME_TYPE } from './useRecorder';

export type ScoringStage = 'idle' | 'uploading' | 'scoring' | 'done' | 'error';

type State = {
  stage: ScoringStage;
  job: ScoringResult | null;
  segments: ScoreSegment[];
  error: string | null;
};

type SubmitInput = {
  blob: Blob;
  surahId: string;
  ayahNumber: number;
};

const POLL_INTERVAL_MS = 2000;

export function useScoringJob() {
  const [state, setState] = useState<State>({
    stage: 'idle',
    job: null,
    segments: [],
    error: null
  });
  const pollerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const clearPolling = useCallback(() => {
    if (pollerRef.current) {
      clearInterval(pollerRef.current);
      pollerRef.current = null;
    }
  }, []);

  useEffect(() => () => clearPolling(), [clearPolling]);

  const reset = useCallback(() => {
    clearPolling();
    setState({ stage: 'idle', job: null, segments: [], error: null });
  }, [clearPolling]);

  const startPolling = useCallback(
    (jobId: string) => {
      clearPolling();
      const poll = async () => {
        try {
          const result = await fetchScoringJob(jobId);
          setState((prev) => ({
            ...prev,
            job: result,
            segments: result.segments,
            stage:
              result.status === 'COMPLETED'
                ? 'done'
                : result.status === 'FAILED'
                  ? 'error'
                  : 'scoring',
            error: result.status === 'FAILED' ? (result.verdict ?? 'Scoring failed') : prev.error
          }));
          if (result.status === 'COMPLETED' || result.status === 'FAILED') {
            clearPolling();
          }
        } catch (err) {
          clearPolling();
          setState((prev) => ({
            ...prev,
            stage: 'error',
            error: err instanceof Error ? err.message : 'Polling failed'
          }));
        }
      };

      void poll();
      pollerRef.current = setInterval(() => void poll(), POLL_INTERVAL_MS);
    },
    [clearPolling]
  );

  const submit = useCallback(
    async ({ blob, surahId, ayahNumber }: SubmitInput): Promise<ScoringResult | null> => {
      setState({ stage: 'uploading', job: null, segments: [], error: null });
      try {
        const upload = await requestSignedUploadUrl({
          filename: `recording-${Date.now()}.webm`,
          contentType: blob.type || RECORDING_MIME_TYPE
        });

        const uploadKey =
          upload.uploadKey ??
          (upload.fields && typeof upload.fields === 'object'
            ? (upload.fields as Record<string, unknown>).key
            : undefined);

        if (typeof uploadKey !== 'string' || !uploadKey) {
          throw new Error('Upload key missing from signed URL response');
        }

        const sessionId = typeof upload.sessionId === 'string' ? upload.sessionId : undefined;

        const putResponse = await fetch(upload.url, {
          method: 'PUT',
          body: blob,
          headers: { 'Content-Type': blob.type || RECORDING_MIME_TYPE }
        });
        if (!putResponse.ok) {
          throw new Error(`Upload failed with status ${putResponse.status}`);
        }

        setState((prev) => ({ ...prev, stage: 'scoring' }));
        const job = await createScoringJobFromUpload({
          sessionId,
          uploadKey,
          surahId,
          ayahNumber
        });

        setState((prev) => ({
          ...prev,
          job,
          segments: job.segments,
          stage:
            job.status === 'COMPLETED' ? 'done' : job.status === 'FAILED' ? 'error' : 'scoring',
          error: job.status === 'FAILED' ? (job.verdict ?? 'Scoring failed') : prev.error
        }));

        if (job.status !== 'COMPLETED' && job.status !== 'FAILED') {
          startPolling(job.jobId);
        }
        return job;
      } catch (err) {
        setState({
          stage: 'error',
          job: null,
          segments: [],
          error: err instanceof Error ? err.message : 'Unexpected error'
        });
        return null;
      }
    },
    [startPolling]
  );

  return { ...state, submit, reset };
}
