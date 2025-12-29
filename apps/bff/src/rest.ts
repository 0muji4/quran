import { Router } from 'express';
import type { ScoringResult } from '@quran-project/shared-ts';
import type { AuthedRequest } from './auth';
import { createScoringJob, createSignedUploadUrl, getScoringJob } from './scoringJobs';
import { telemetry } from './telemetry';

type SignedUploadResponse = ReturnType<typeof createSignedUploadUrl>;

type JobResponse = ScoringResult;

export const restRouter = Router();

const scoringRequestDuration = telemetry.meter.createHistogram('bff.scoring.request.duration', {
  description: 'Duration of scoring job REST requests',
  unit: 'ms'
});

restRouter.post('/signed-upload-url', (req: AuthedRequest, res) => {
  const { filename, contentType } = req.body ?? {};

  if (!filename || !contentType) {
    res.status(400).json({ error: 'filename and contentType are required' });
    return;
  }

  const response: SignedUploadResponse = createSignedUploadUrl({ filename, contentType });
  res.json(response);
});

restRouter.post('/scoring-jobs', (req: AuthedRequest, res) => {
  const startedAt = Date.now();
  const { uploadKey, surahId, ayahNumber, transcript } = req.body ?? {};
  const sessionId = typeof uploadKey === 'string' ? uploadKey : 'unknown';

  if (!uploadKey || !surahId) {
    res.status(400).json({ error: 'uploadKey and surahId are required' });
    scoringRequestDuration.record(Date.now() - startedAt, {
      route: '/scoring-jobs',
      method: 'POST',
      session_id: sessionId,
      status: 'bad_request'
    });
    console.info('scoring job request rejected', { session_id: sessionId });
    return;
  }

  const job: JobResponse = createScoringJob({
    uploadKey,
    surahId,
    ayahNumber: typeof ayahNumber === 'number' ? ayahNumber : null,
    transcript,
    userId: req.session?.id ?? null
  });

  res.status(201).json(job);
  scoringRequestDuration.record(Date.now() - startedAt, {
    route: '/scoring-jobs',
    method: 'POST',
    session_id: job.jobId,
    status: job.status
  });
  console.info('scoring job created', { session_id: job.jobId, status: job.status });
});

restRouter.get('/scoring-jobs/:jobId', (req: AuthedRequest, res) => {
  const startedAt = Date.now();
  const sessionId = req.params.jobId;
  const job = getScoringJob(req.params.jobId);

  if (!job) {
    res.status(404).json({ error: 'Job not found' });
    scoringRequestDuration.record(Date.now() - startedAt, {
      route: '/scoring-jobs/:jobId',
      method: 'GET',
      session_id: sessionId,
      status: 'not_found'
    });
    console.info('scoring job not found', { session_id: sessionId });
    return;
  }

  res.json(job);
  scoringRequestDuration.record(Date.now() - startedAt, {
    route: '/scoring-jobs/:jobId',
    method: 'GET',
    session_id: sessionId,
    status: job.status
  });
  console.info('scoring job fetched', { session_id: sessionId, status: job.status });
});
