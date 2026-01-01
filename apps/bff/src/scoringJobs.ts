import { randomUUID } from 'crypto';
import type { ScoreSegment, ScoringResult, ScoringStatus } from '@quran-project/shared-ts';
import { findSurah } from './data';
import { getMinioClient, recordUploadKey } from './storage';

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
const uploadPrefix = (): string => process.env.MINIO_UPLOAD_PREFIX ?? 'uploads/';
const uploadTtlSeconds = (): number =>
  Number(process.env.SIGNED_URL_TTL_SECONDS ?? '900');

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
      ayahNumber: typeof input.ayahNumber === 'number' ? input.ayahNumber : null
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

export const createSignedUploadUrl = async (input: {
  filename: string;
  contentType: string;
  userId: string | null;
}): Promise<{ uploadKey: string; url: string; fields: Record<string, unknown>; expiresAt: string }> => {
  const prefix = uploadPrefix();
  const uploadKey = `${prefix}${Date.now()}-${encodeURIComponent(input.filename)}`;
  const expiresIn = uploadTtlSeconds();
  const expiresAt = secondsFromNow(expiresIn);
  const client = getMinioClient();
  const bucket = process.env.MINIO_BUCKET;

  if (client && bucket) {
    const url = await client.presignedPutObject(bucket, uploadKey, expiresIn);
    await recordUploadKey({
      sessionId: uploadKey,
      userId: input.userId,
      audioKey: uploadKey,
      expiresAt: new Date(Date.now() + expiresIn * 1000)
    });
    return {
      uploadKey,
      url,
      fields: {
        key: uploadKey,
        'Content-Type': input.contentType
      },
      expiresAt
    };
  }

  const baseUrl = process.env.UPLOAD_BASE_URL ?? 'https://uploads.local';
  await recordUploadKey({
    sessionId: uploadKey,
    userId: input.userId,
    audioKey: uploadKey,
    expiresAt: new Date(Date.now() + expiresIn * 1000)
  });

  return {
    uploadKey,
    url: `${baseUrl}/${uploadKey}`,
    fields: {
      key: uploadKey,
      'Content-Type': input.contentType
    },
    expiresAt
  };
};
