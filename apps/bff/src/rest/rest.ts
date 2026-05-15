import { Router } from 'express';
import type { ScoringResult } from '@quran-project/shared-ts';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import type { AuthedRequest } from '../auth';
import { requireAuth } from '../auth';
import { issueAccessToken, issueRefreshToken } from '../auth/credentials';
import {
  findRefreshToken,
  hashRefreshToken,
  markRefreshTokenUsed,
  recordIssuedRefreshToken,
  revokeAllRefreshTokensForUser
} from '../auth/refresh-tokens';
import { createScoringJob, createSignedUploadUrl, getScoringJob } from '../jobs';
import { deleteUserData, ensureReferenceAudio, ReferenceUnavailableError } from '../infra';
import { logger, telemetry, recordSessionCreated, recordSessionCompleted } from '../telemetry';
import { surahIdSchema, ayahNumberSchema } from '../validation/quranValidation';

// #region Schemas
const signedUploadUrlSchema = z.object({
  body: z.object({
    filename: z.string().min(1),
    contentType: z.string().startsWith('audio/')
  })
});

const createScoringJobSchema = z.object({
  body: z.object({
    uploadKey: z.string().min(1),
    surahId: surahIdSchema,
    ayahNumber: ayahNumberSchema,
    sessionId: z.string().optional()
  })
});

const getScoringJobSchema = z.object({
  params: z.object({
    jobId: z.string().min(1)
  })
});

const refreshTokenSchema = z.object({
  body: z.object({
    refreshToken: z.string().min(1)
  })
});

const deleteUserDataSchema = z.object({
  params: z.object({
    sessionId: z.string().min(1)
  })
});

const referenceAudioSchema = z.object({
  query: z.object({
    surah: z.coerce.number().int().min(1).max(114),
    ayah: z.coerce.number().int().min(1).max(286)
  })
});
// #endregion

type SignedUploadResponse = Awaited<ReturnType<typeof createSignedUploadUrl>>;
type JobResponse = ScoringResult;

export const restRouter = Router();

const scoringRequestDuration = telemetry.meter.createHistogram('bff.scoring.request.duration', {
  description: 'Duration of scoring job REST requests',
  unit: 'ms'
});

restRouter.post('/signed-upload-url', async (req: AuthedRequest, res) => {
  const validation = signedUploadUrlSchema.safeParse(req);
  if (!validation.success) {
    return res.status(400).json({ errors: validation.error.issues });
  }
  const { filename, contentType } = validation.data.body;

  const session = requireAuth(req, res);
  if (!session) return;

  let response: SignedUploadResponse;
  try {
    response = await createSignedUploadUrl({
      filename,
      contentType,
      userId: session.id
    });
  } catch (error) {
    res.status(502).json({ error: 'Failed to create signed upload url' });
    logger.error('signed upload url create failed', { user_id: session.id, error });
    return;
  }

  res.json(response);
});

restRouter.post('/scoring-jobs', async (req: AuthedRequest, res) => {
  const startedAt = Date.now();
  const validation = createScoringJobSchema.safeParse(req);
  if (!validation.success) {
    scoringRequestDuration.record(Date.now() - startedAt, {
      route: '/scoring-jobs',
      method: 'POST',
      status: 'bad_request'
    });
    return res.status(400).json({ errors: validation.error.issues });
  }

  const { uploadKey, surahId, ayahNumber, sessionId: requestSessionId } = validation.data.body;
  const sessionId = requestSessionId ?? uploadKey ?? 'unknown';

  const session = requireAuth(req, res);
  if (!session) return;

  let job: JobResponse;
  try {
    job = await createScoringJob({
      sessionId: requestSessionId ?? null,
      uploadKey,
      surahId,
      ayahNumber,
      userId: session.id
    });
  } catch (error) {
    res.status(502).json({ error: 'Failed to create scoring job' });
    scoringRequestDuration.record(Date.now() - startedAt, {
      route: '/scoring-jobs',
      method: 'POST',
      session_id: sessionId,
      status: 'backend_error'
    });
    logger.error('scoring job create failed', { session_id: sessionId, error });
    return;
  }

  // Record session created metric
  recordSessionCreated(session.id);

  res.status(201).json(job);
  scoringRequestDuration.record(Date.now() - startedAt, {
    route: '/scoring-jobs',
    method: 'POST',
    session_id: job.jobId,
    status: job.status
  });
  logger.info('scoring job created', { session_id: job.jobId, status: job.status });
});

restRouter.get('/scoring-jobs/:jobId', async (req: AuthedRequest, res) => {
  const startedAt = Date.now();
  const validation = getScoringJobSchema.safeParse(req);
  if (!validation.success) {
    return res.status(400).json({ errors: validation.error.issues });
  }
  const { jobId } = validation.data.params;

  const session = requireAuth(req, res);
  if (!session) return;

  let job: JobResponse | null;
  try {
    job = await getScoringJob(jobId);
  } catch (error) {
    res.status(502).json({ error: 'Failed to fetch scoring job' });
    scoringRequestDuration.record(Date.now() - startedAt, {
      route: '/scoring-jobs/:jobId',
      method: 'GET',
      session_id: jobId,
      status: 'backend_error'
    });
    logger.error('scoring job fetch failed', { session_id: jobId, error });
    return;
  }

  if (!job) {
    res.status(404).json({ error: 'Job not found' });
    scoringRequestDuration.record(Date.now() - startedAt, {
      route: '/scoring-jobs/:jobId',
      method: 'GET',
      session_id: jobId,
      status: 'not_found'
    });
    logger.info('scoring job not found', { session_id: jobId });
    return;
  }

  // Record session completed metric if job is completed
  if (job.status === 'COMPLETED' && job.feedback?.accuracy !== undefined) {
    recordSessionCompleted(session.id, job.feedback.accuracy);
  }

  res.json(job);
  scoringRequestDuration.record(Date.now() - startedAt, {
    route: '/scoring-jobs/:jobId',
    method: 'GET',
    session_id: jobId,
    status: job.status
  });
  logger.info('scoring job fetched', { session_id: jobId, status: job.status });
});

restRouter.post('/auth/refresh', async (req: AuthedRequest, res) => {
  const validation = refreshTokenSchema.safeParse(req);
  if (!validation.success) {
    return res.status(400).json({ errors: validation.error.issues });
  }
  const { refreshToken } = validation.data.body;
  const refreshSecret = process.env.REFRESH_TOKEN_SECRET;
  if (!refreshSecret) {
    logger.error('REFRESH_TOKEN_SECRET is not configured');
    return res.status(500).json({ error: 'Server configuration error' });
  }

  // Stateless verify first (defense in depth): a forged token is
  // rejected without a DB round-trip. The DB row is then authoritative
  // for "has this exact token been redeemed or revoked".
  let payload: jwt.JwtPayload;
  try {
    payload = jwt.verify(refreshToken, refreshSecret) as jwt.JwtPayload;
  } catch {
    return res.status(401).json({ error: 'invalid refresh token' });
  }

  const tokenHash = hashRefreshToken(refreshToken);
  try {
    const row = await findRefreshToken(tokenHash);
    if (!row || row.revokedAt) {
      return res.status(401).json({ error: 'invalid refresh token' });
    }
    if (row.usedAt) {
      // Replay: the same token is being redeemed twice. We can't tell
      // which holder is legitimate, so revoke every outstanding token
      // for the user and force a fresh /auth/login.
      logger.warn('refresh token replay detected', { user_id: row.userId });
      await revokeAllRefreshTokensForUser(row.userId);
      return res.status(401).json({ error: 'invalid refresh token' });
    }

    await markRefreshTokenUsed(tokenHash);

    const session = {
      sub: row.userId,
      email: payload.email as string | undefined,
      name: (payload.name ?? payload.displayName) as string | undefined
    };
    const newAccessToken = issueAccessToken(session);
    const newRefreshToken = issueRefreshToken(session);
    const decoded = jwt.decode(newRefreshToken) as { exp: number };
    await recordIssuedRefreshToken({
      userId: row.userId,
      tokenHash: hashRefreshToken(newRefreshToken),
      expiresAt: new Date(decoded.exp * 1000)
    });

    res.json({ accessToken: newAccessToken, refreshToken: newRefreshToken });
  } catch (error) {
    logger.error('POST /auth/refresh failed', { error });
    res.status(502).json({ error: 'Failed to refresh token' });
  }
});

restRouter.get('/reference-audio', async (req, res) => {
  const validation = referenceAudioSchema.safeParse(req);
  if (!validation.success) {
    return res.status(400).json({ errors: validation.error.issues });
  }
  const { surah, ayah } = validation.data.query;
  try {
    const result = await ensureReferenceAudio(surah, ayah);
    res.json({ url: result.signedUrl, expiresAt: result.expiresAt });
  } catch (error) {
    if (error instanceof ReferenceUnavailableError) {
      return res.status(503).json({ error: 'REFERENCE_UNAVAILABLE' });
    }
    logger.error('reference audio fetch failed', { surah, ayah, error });
    res.status(502).json({ error: 'STORAGE_OR_SOURCE_UNAVAILABLE' });
  }
});

restRouter.delete('/user-data/:sessionId', async (req: AuthedRequest, res) => {
  const validation = deleteUserDataSchema.safeParse(req);
  if (!validation.success) {
    return res.status(400).json({ errors: validation.error.issues });
  }
  const { sessionId } = validation.data.params;

  const session = requireAuth(req, res);
  if (!session) return;

  const deleted = await deleteUserData({ sessionId, userId: session.id });
  if (!deleted) {
    res.status(404).json({ error: 'user data not found' });
    return;
  }

  res.json({ status: 'deleted', sessionId });
});
