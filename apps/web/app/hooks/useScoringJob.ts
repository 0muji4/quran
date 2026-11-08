'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { ScoreSegment, ScoringResult } from '@quran-project/shared-ts';
import {
  createScoringJobFromUpload,
  fetchScoringJob,
  requestSignedUploadUrl,
  type CreateScoringJobErrorCode
} from '../actions';
import { RECORDING_MIME_TYPE } from './useRecorder';

export type ScoringStage = 'idle' | 'uploading' | 'scoring' | 'done' | 'error';

// A failure is a code, not text: a server action error reaches the browser
// only as React's generic production message, so the screen picks its own
// wording. `failure` stays null for failures the user cannot act on.
interface State {
  stage: ScoringStage;
  job: ScoringResult | null;
  segments: ScoreSegment[];
  failure: CreateScoringJobErrorCode | null;
}

interface SubmitInput {
  blob: Blob;
  surahId: string;
  ayahNumber: number;
}

const POLL_INTERVAL_MS = 2000;

export function useScoringJob() {
  const [state, setState] = useState<State>({
    stage: 'idle',
    job: null,
    segments: [],
    failure: null
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
    setState({ stage: 'idle', job: null, segments: [], failure: null });
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
                  : 'scoring'
          }));
          if (result.status === 'COMPLETED' || result.status === 'FAILED') {
            clearPolling();
          }
        } catch (err) {
          clearPolling();
          console.error('[scoring] polling failed', err);
          setState((prev) => ({ ...prev, stage: 'error' }));
        }
      };

      void poll();
      pollerRef.current = setInterval(() => void poll(), POLL_INTERVAL_MS);
    },
    [clearPolling]
  );

  const submit = useCallback(
    async ({ blob, surahId, ayahNumber }: SubmitInput): Promise<ScoringResult | null> => {
      setState({ stage: 'uploading', job: null, segments: [], failure: null });
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
        const created = await createScoringJobFromUpload({
          sessionId,
          uploadKey,
          surahId,
          ayahNumber
        });
        if (!created.ok) {
          setState({ stage: 'error', job: null, segments: [], failure: created.error });
          return null;
        }
        const job = created.job;

        setState((prev) => ({
          ...prev,
          job,
          segments: job.segments,
          stage: job.status === 'COMPLETED' ? 'done' : job.status === 'FAILED' ? 'error' : 'scoring'
        }));

        if (job.status !== 'COMPLETED' && job.status !== 'FAILED') {
          startPolling(job.jobId);
        }
        return job;
      } catch (err) {
        console.error('[scoring] submit failed', err);
        setState({ stage: 'error', job: null, segments: [], failure: null });
        return null;
      }
    },
    [startPolling]
  );

  return { ...state, submit, reset };
}
