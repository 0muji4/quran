import { Router } from 'express';
import { z } from 'zod';
import type { AuthedRequest } from '../auth';
import { requireAuth } from '../auth';
import { logger } from '../telemetry';
import {
  getBestScores,
  getLastPracticed,
  getRecentAttempts,
  recordPracticeAttempt,
  upsertBestScore,
  upsertLastPracticed
} from './storage';

// All handlers gate on requireAuth. Under MOCK_SESSION=true (dev / CI)
// the session resolves to id 'mock-user', which is also seeded in the
// users table for integration tests; under real auth (ADR 0010) the
// session id is the authenticated user UUID.

export const meRouter = Router();

const attemptsQuerySchema = z.object({
  query: z.object({
    limit: z.coerce.number().int().min(1).max(200).optional().default(50)
  })
});

const isoDateString = z.string().datetime();
const surahIdString = z.string().min(1).max(8);
const ayahNumberInt = z.number().int().min(1).max(286);
const scoreInt = z.number().int().min(0).max(100);

const lastPracticedBodySchema = z.object({
  body: z.object({
    surahId: surahIdString,
    ayahNumber: ayahNumberInt,
    surahNameEn: z.string().min(1).max(64),
    surahNameAr: z.string().min(1).max(64),
    ayahCount: z.number().int().min(1).max(286),
    practicedAt: isoDateString
  })
});

const bestScoreParamsSchema = z.object({
  params: z.object({
    // Composite key surahId:ayahNumber, e.g. "2:255".
    key: z.string().regex(/^[A-Za-z0-9-]+:\d+$/, 'expected "<surahId>:<ayahNumber>"')
  }),
  body: z.object({
    score: scoreInt,
    achievedAt: isoDateString
  })
});

const attemptBodySchema = z.object({
  body: z.object({
    surahId: surahIdString,
    surahNameEn: z.string().min(1).max(64),
    ayahNumber: ayahNumberInt,
    score: scoreInt.nullable(),
    jobId: z.string().min(1),
    status: z.enum(['COMPLETED', 'FAILED']),
    durationMs: z.number().int().nonnegative().nullable().optional(),
    createdAt: isoDateString
  })
});

meRouter.get('/me/last-practiced', async (req: AuthedRequest, res) => {
  const session = requireAuth(req, res);
  if (!session) return;
  try {
    const row = await getLastPracticed(session.id);
    res.json(row);
  } catch (error) {
    logger.error('GET /me/last-practiced failed', {
      user_id: session.id,
      error
    });
    res.status(502).json({ error: 'Failed to fetch last-practiced' });
  }
});

meRouter.get('/me/best-scores', async (req: AuthedRequest, res) => {
  const session = requireAuth(req, res);
  if (!session) return;
  try {
    const scores = await getBestScores(session.id);
    res.json(scores);
  } catch (error) {
    logger.error('GET /me/best-scores failed', { user_id: session.id, error });
    res.status(502).json({ error: 'Failed to fetch best-scores' });
  }
});

meRouter.get('/me/attempts', async (req: AuthedRequest, res) => {
  const validation = attemptsQuerySchema.safeParse(req);
  if (!validation.success) {
    return res.status(400).json({ errors: validation.error.issues });
  }
  const { limit } = validation.data.query;

  const session = requireAuth(req, res);
  if (!session) return;

  try {
    const attempts = await getRecentAttempts(session.id, limit);
    res.json({ attempts });
  } catch (error) {
    logger.error('GET /me/attempts failed', { user_id: session.id, error });
    res.status(502).json({ error: 'Failed to fetch attempts' });
  }
});

meRouter.put('/me/last-practiced', async (req: AuthedRequest, res) => {
  const validation = lastPracticedBodySchema.safeParse(req);
  if (!validation.success) {
    return res.status(400).json({ errors: validation.error.issues });
  }
  const session = requireAuth(req, res);
  if (!session) return;
  try {
    const row = await upsertLastPracticed(session.id, validation.data.body);
    res.json(row);
  } catch (error) {
    logger.error('PUT /me/last-practiced failed', {
      user_id: session.id,
      error
    });
    res.status(502).json({ error: 'Failed to update last-practiced' });
  }
});

meRouter.put('/me/best-scores/:key', async (req: AuthedRequest, res) => {
  const validation = bestScoreParamsSchema.safeParse(req);
  if (!validation.success) {
    return res.status(400).json({ errors: validation.error.issues });
  }
  const { key } = validation.data.params;
  const [surahId, ayahNumberRaw] = key.split(':');
  const ayahNumber = Number(ayahNumberRaw);
  if (!Number.isInteger(ayahNumber) || ayahNumber < 1) {
    return res.status(400).json({ error: 'invalid ayahNumber in key' });
  }
  const session = requireAuth(req, res);
  if (!session) return;
  try {
    const entry = await upsertBestScore(session.id, surahId, ayahNumber, validation.data.body);
    res.json(entry);
  } catch (error) {
    logger.error('PUT /me/best-scores/:key failed', {
      user_id: session.id,
      key,
      error
    });
    res.status(502).json({ error: 'Failed to update best-score' });
  }
});

meRouter.post('/me/attempts', async (req: AuthedRequest, res) => {
  const validation = attemptBodySchema.safeParse(req);
  if (!validation.success) {
    return res.status(400).json({ errors: validation.error.issues });
  }
  const session = requireAuth(req, res);
  if (!session) return;
  try {
    const row = await recordPracticeAttempt(session.id, {
      ...validation.data.body,
      durationMs: validation.data.body.durationMs ?? null
    });
    res.status(201).json(row);
  } catch (error) {
    logger.error('POST /me/attempts failed', { user_id: session.id, error });
    res.status(502).json({ error: 'Failed to record attempt' });
  }
});
