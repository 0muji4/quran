import { randomUUID } from 'crypto';
import type { ScoreSegment, ScoringResult, ScoringStatus } from '@quran-project/shared-ts';
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

const jobs = new Map<string, StoredJob>();

const toResult = (job: StoredJob): ScoringResult => ({
  ...job,
  verdict: job.verdict ?? undefined,
  score: job.score ?? undefined,
  evaluation: job.evaluation ?? undefined
});

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

export const createScoringJob = (input: {
  uploadKey: string;
  surahId: string;
  ayahNumber?: number | null;
  transcript?: string | null;
  userId?: string | null;
}): ScoringResult => {
  const jobId = randomUUID();
  const now = new Date().toISOString();
  const surah = findSurah(input.surahId);

  const job: StoredJob = {
    jobId,
    uploadKey: input.uploadKey,
    status: 'QUEUED',
    score: null,
    segments: [],
    verdict: null,
    createdAt: now,
    evaluation: {
      userId: input.userId ?? null,
      surah: surah?.nameEn ?? input.surahId,
      ayahNumber: typeof input.ayahNumber === 'number' ? input.ayahNumber : null,
      transcript: input.transcript ?? null
    }
  };

  jobs.set(jobId, job);
  markForCompletion(jobId, job.evaluation);

  return toResult(job);
};

export const getScoringJob = (jobId: string): ScoringResult | null => {
  const job = jobs.get(jobId);
  return job ? toResult(job) : null;
};

export const createSignedUploadUrl = (input: {
  filename: string;
  contentType: string;
}): { uploadKey: string; url: string; fields: Record<string, unknown>; expiresAt: string } => {
  const uploadKey = `${Date.now()}-${encodeURIComponent(input.filename)}`;
  const baseUrl = process.env.UPLOAD_BASE_URL ?? 'https://uploads.local';

  return {
    uploadKey,
    url: `${baseUrl}/${uploadKey}`,
    fields: {
      key: uploadKey,
      'Content-Type': input.contentType
    },
    expiresAt: secondsFromNow(900)
  };
};
