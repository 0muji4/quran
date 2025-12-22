import { randomUUID } from 'crypto';
import { Router } from 'express';
import type { ScoreSegment, ScoringResult, ScoringStatus } from '@quran-project/shared-ts';
import type { AuthedRequest } from './auth';
import { findSurah } from './data';

type StoredJob = {
  jobId: string;
  uploadKey: string;
  status: ScoringStatus;
  score: number | null;
  segments: ScoreSegment[];
  verdict: string | null;
  createdAt: string;
  evaluation: Record<string, unknown> | null;
};

const secondsFromNow = (seconds: number): string => new Date(Date.now() + seconds * 1000).toISOString();

const defaultSegments: ScoreSegment[] = [
  { label: 'tajweed', score: 0.88, metrics: { pace: 'steady' } },
  { label: 'pronunciation', score: 0.95 }
];

const toResult = (job: StoredJob): ScoringResult => ({
  ...job,
  verdict: job.verdict ?? undefined,
  score: job.score ?? undefined,
  evaluation: job.evaluation ?? undefined
});

const jobs = new Map<string, StoredJob>();

const markForCompletion = (jobId: string, evaluation: Record<string, unknown> | null) => {
  setTimeout(() => {
    const job = jobs.get(jobId);
    if (!job) return;

    job.status = 'RUNNING';

    setTimeout(() => {
      const currentJob = jobs.get(jobId);
      if (!currentJob) return;

      currentJob.status = 'COMPLETED';
      currentJob.score = 0.92;
      currentJob.verdict = 'Audio accepted for review';
      currentJob.segments = defaultSegments;
      currentJob.evaluation = evaluation;
    }, 800);
  }, 400);
};

export const restRouter = Router();

restRouter.post('/signed-upload-url', (req: AuthedRequest, res) => {
  const { filename, contentType } = req.body ?? {};

  if (!filename || !contentType) {
    res.status(400).json({ error: 'filename and contentType are required' });
    return;
  }

  const uploadKey = `${Date.now()}-${encodeURIComponent(filename)}`;
  const baseUrl = process.env.UPLOAD_BASE_URL ?? 'https://uploads.local';

  res.json({
    uploadKey,
    url: `${baseUrl}/${uploadKey}`,
    fields: {
      key: uploadKey,
      'Content-Type': contentType
    },
    expiresAt: secondsFromNow(900)
  });
});

restRouter.post('/scoring-jobs', (req: AuthedRequest, res) => {
  const { uploadKey, surahId, ayahNumber, transcript } = req.body ?? {};

  if (!uploadKey || !surahId) {
    res.status(400).json({ error: 'uploadKey and surahId are required' });
    return;
  }

  const jobId = randomUUID();
  const now = new Date().toISOString();
  const surah = findSurah(surahId);

  const job: StoredJob = {
    jobId,
    uploadKey,
    status: 'QUEUED',
    score: null,
    segments: [],
    verdict: null,
    createdAt: now,
    evaluation: {
      userId: req.session?.id ?? null,
      surah: surah?.nameEn ?? surahId,
      ayahNumber: typeof ayahNumber === 'number' ? ayahNumber : null,
      transcript: transcript ?? null
    }
  };

  jobs.set(jobId, job);
  markForCompletion(jobId, job.evaluation);

  res.status(201).json(toResult(job));
});

restRouter.get('/scoring-jobs/:jobId', (req: AuthedRequest, res) => {
  const job = jobs.get(req.params.jobId);

  if (!job) {
    res.status(404).json({ error: 'Job not found' });
    return;
  }

  res.json(toResult(job));
});
