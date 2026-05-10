import { Router } from 'express';
import { z } from 'zod';
import type { AuthedRequest } from '../auth';
import { requireAuth } from '../auth';
import { logger } from '../telemetry';
import { getBestScores, getLastPracticed, getRecentAttempts } from './storage';

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
