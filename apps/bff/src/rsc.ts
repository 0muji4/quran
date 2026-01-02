import { createHash } from 'crypto';
import { Router } from 'express';
import type { AuthedRequest } from './auth';
import { requireAuth } from './auth';
import { findSurah, surahs } from './data';
import { getScoringJob } from './scoringJobs';
import { telemetry } from './telemetry';

export const rscRouter = Router();

const scoresRequestDuration = telemetry.meter.createHistogram('bff.rsc.scores.request.duration', {
  description: 'Duration of score lookup requests',
  unit: 'ms'
});

rscRouter.get('/surahs', (req: AuthedRequest, res) => {
  res.json({
    user: req.session ?? null,
    surahs: surahs.map((surah) => ({
      id: surah.id,
      nameEn: surah.nameEn,
      nameAr: surah.nameAr,
      ayahCount: surah.ayahCount,
      revelationPlace: surah.revelationPlace
    }))
  });
});

rscRouter.get('/surah/:surahId/ayahs', (req: AuthedRequest, res) => {
  const surah = findSurah(req.params.surahId);

  if (!surah) {
    res.status(404).json({ error: 'Surah not found' });
    return;
  }

  res.json({
    user: req.session ?? null,
    surah: {
      id: surah.id,
      nameEn: surah.nameEn,
      nameAr: surah.nameAr
    },
    ayahs: surah.ayahs
  });
});

rscRouter.get('/scores/:sessionId', async (req: AuthedRequest, res) => {
  const startedAt = Date.now();
  const sessionId = req.params.sessionId;
  const session = requireAuth(req, res);
  if (!session) return;
  let job;
  try {
    job = await getScoringJob(sessionId);
  } catch (error) {
    res.status(502).json({ error: 'Scores unavailable' });
    scoresRequestDuration.record(Date.now() - startedAt, {
      route: '/scores/:sessionId',
      method: 'GET',
      session_id: sessionId,
      status: 'backend_error'
    });
    console.error('scores fetch failed', { session_id: sessionId, error });
    return;
  }

  if (!job) {
    res.status(404).json({ error: 'Scores not found' });
    scoresRequestDuration.record(Date.now() - startedAt, {
      route: '/scores/:sessionId',
      method: 'GET',
      session_id: sessionId,
      status: 'not_found'
    });
    console.info('scores not found', { session_id: sessionId });
    return;
  }

  const summary = {
    status: job.status,
    score: job.score ?? null,
    verdict: job.verdict ?? null,
    createdAt: job.createdAt,
    segmentCount: job.segments.length
  };
  const summaryHash = createHash('sha256').update(JSON.stringify(summary)).digest('hex');
  const etag = `"${summaryHash}"`;
  res.setHeader('ETag', etag);

  if (req.headers['if-none-match'] === etag) {
    res.status(304).end();
    scoresRequestDuration.record(Date.now() - startedAt, {
      route: '/scores/:sessionId',
      method: 'GET',
      session_id: sessionId,
      status: 'not_modified'
    });
    console.info('scores not modified', { session_id: sessionId });
    return;
  }

  res.json({
    sessionId,
    attempts: {
      summary,
      segments: job.segments,
      evaluation: job.evaluation ?? null
    }
  });
  scoresRequestDuration.record(Date.now() - startedAt, {
    route: '/scores/:sessionId',
    method: 'GET',
    session_id: sessionId,
    status: job.status
  });
  console.info('scores fetched', { session_id: sessionId, status: job.status });
});
