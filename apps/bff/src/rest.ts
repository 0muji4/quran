import { Router } from 'express';
import type { ScoringResult } from '@quran-project/shared-ts';
import jwt from 'jsonwebtoken';
import type { AuthedRequest } from './auth';
import { requireAuth } from './auth';
import { createScoringJob, createSignedUploadUrl, getScoringJob } from './scoringJobs';
import { deleteUserData } from './storage';
import { telemetry } from './telemetry';

type SignedUploadResponse = Awaited<ReturnType<typeof createSignedUploadUrl>>;

type JobResponse = ScoringResult;

export const restRouter = Router();

const scoringRequestDuration = telemetry.meter.createHistogram('bff.scoring.request.duration', {
  description: 'Duration of scoring job REST requests',
  unit: 'ms'
});

restRouter.post('/signed-upload-url', async (req: AuthedRequest, res) => {
  const { filename, contentType } = req.body ?? {};

  if (!filename || !contentType) {
    res.status(400).json({ error: 'filename and contentType are required' });
    return;
  }

  const session = requireAuth(req, res);
  if (!session) return;

  const response: SignedUploadResponse = await createSignedUploadUrl({
    filename,
    contentType,
    userId: session.id
  });
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

  const session = requireAuth(req, res);
  if (!session) return;

  const job: JobResponse = createScoringJob({
    uploadKey,
    surahId,
    ayahNumber: typeof ayahNumber === 'number' ? ayahNumber : null,
    transcript,
    userId: session.id
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
  const session = requireAuth(req, res);
  if (!session) return;
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

restRouter.post('/auth/refresh', (req: AuthedRequest, res) => {
  const { refreshToken } = req.body ?? {};
  const refreshSecret = process.env.REFRESH_TOKEN_SECRET;
  const accessSecret = process.env.JWT_SECRET;

  if (!refreshToken || !refreshSecret || !accessSecret) {
    res.status(400).json({ error: 'refreshToken is required' });
    return;
  }

  try {
    const payload = jwt.verify(refreshToken, refreshSecret) as jwt.JwtPayload;
    const session = {
      sub: (payload.sub as string) ?? (payload.id as string) ?? 'anonymous',
      email: payload.email,
      name: payload.name ?? payload.displayName
    };
    const token = jwt.sign(session, accessSecret, { expiresIn: '15m' });
    res.json({ accessToken: token });
  } catch {
    res.status(401).json({ error: 'invalid refresh token' });
  }
});

restRouter.delete('/user-data/:sessionId', async (req: AuthedRequest, res) => {
  const session = requireAuth(req, res);
  if (!session) return;
  const { sessionId } = req.params;
  if (!sessionId) {
    res.status(400).json({ error: 'sessionId is required' });
    return;
  }

  const deleted = await deleteUserData({ sessionId, userId: session.id });
  if (!deleted) {
    res.status(404).json({ error: 'user data not found' });
    return;
  }

  res.json({ status: 'deleted', sessionId });
});
