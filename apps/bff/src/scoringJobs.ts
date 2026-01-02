import { randomUUID } from 'crypto';
import type { PronunciationFeedback, ScoringResult, WordAlignment } from '@quran-project/shared-ts';
import {
  findSessionIdForUploadKey,
  getDatabasePool,
  getMinioClientForPresignedUrls,
  recordUploadKey
} from './storage';

const secondsFromNow = (seconds: number): string => new Date(Date.now() + seconds * 1000).toISOString();
const uploadPrefix = (): string => process.env.MINIO_UPLOAD_PREFIX ?? 'uploads/';
const uploadTtlSeconds = (): number =>
  Number(process.env.SIGNED_URL_TTL_SECONDS ?? '900');

const backendUrl = process.env.BACKEND_URL ?? 'http://localhost:8080';

const parseJson = async <T>(response: Response): Promise<T> => {
  const payload = (await response.json()) as unknown;

  if (!response.ok) {
    const message =
      typeof payload === 'object' && payload && 'error' in (payload as Record<string, unknown>)
        ? (payload as Record<string, unknown>).error
        : response.statusText;
    throw new Error(typeof message === 'string' ? message : 'Request failed');
  }

  return payload as T;
};

const clampScore = (value: number): number => Math.min(Math.max(value, 0), 1);

const parseJsonValue = <T>(value: unknown, fallback: T): T => {
  if (value === null || value === undefined) return fallback;
  if (typeof value === 'string') {
    try {
      return JSON.parse(value) as T;
    } catch {
      return fallback;
    }
  }
  return value as T;
};

const numberOrNull = (value: unknown): number | null => {
  if (typeof value === 'number') return value;
  if (typeof value === 'string') {
    const parsed = Number(value);
    return Number.isNaN(parsed) ? null : parsed;
  }
  return null;
};

type RawAlignment = {
  ref_word?: string | null;
  hyp_word?: string | null;
  op?: string | null;
};

type RawTimestamp = {
  probability?: number | null;
};

const buildPronunciationFeedback = (
  wordAlignments: RawAlignment[],
  wordTimestamps: RawTimestamp[],
  wer: number | null
): PronunciationFeedback | null => {
  if (wordAlignments.length === 0 && wordTimestamps.length === 0 && wer === null) {
    return null;
  }

  const refCount = wordAlignments.filter((alignment) => alignment.ref_word).length;
  const matchCount = wordAlignments.filter((alignment) => alignment.op === 'match').length;
  const substituteCount = wordAlignments.filter((alignment) => alignment.op === 'substitute').length;
  const deleteCount = wordAlignments.filter((alignment) => alignment.op === 'delete').length;

  const accuracy =
    wer !== null
      ? clampScore(1 - wer)
      : clampScore(matchCount / Math.max(1, matchCount + substituteCount + deleteCount));
  const completeness = clampScore((refCount - deleteCount) / Math.max(1, refCount));

  const probabilities = wordTimestamps
    .map((timestamp) => timestamp.probability)
    .filter((value): value is number => typeof value === 'number');
  const fluency = probabilities.length
    ? clampScore(probabilities.reduce((sum, value) => sum + value, 0) / probabilities.length)
    : 0;

  const overall = clampScore((accuracy + fluency + completeness) / 3);

  const normalizedAlignments: WordAlignment[] = wordAlignments.map((alignment) => ({
    refWord: alignment.ref_word ?? null,
    hypWord: alignment.hyp_word ?? null,
    op: alignment.op ?? 'match'
  }));

  return {
    accuracy,
    fluency,
    completeness,
    overall,
    wordAlignments: normalizedAlignments
  };
};

export const createScoringJob = async (input: {
  sessionId?: string | null;
  uploadKey: string;
  surahId: string;
  ayahNumber?: number | null;
  userId?: string | null;
}): Promise<ScoringResult> => {
  const sessionId =
    input.sessionId ??
    (await findSessionIdForUploadKey({
      audioKey: input.uploadKey,
      userId: input.userId ?? null
    }));

  if (!sessionId) {
    throw new Error('Session ID not found for upload key');
  }

  const response = await fetch(`${backendUrl}/api/scoring-jobs`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      uploadKey: input.uploadKey,
      sessionId,
      surahId: input.surahId,
      ayahNumber: typeof input.ayahNumber === 'number' ? input.ayahNumber : null,
      userId: input.userId ?? null
    })
  });

  return parseJson<ScoringResult>(response);
};

export const getScoringJob = async (jobId: string): Promise<ScoringResult | null> => {
  const pool = getDatabasePool();
  if (!pool) {
    const response = await fetch(`${backendUrl}/api/scoring-jobs/${jobId}`);
    if (response.status === 404) return null;
    return parseJson<ScoringResult>(response);
  }

  const result = await pool.query(
    `
    SELECT
      scoring_jobs.session_id,
      scoring_jobs.upload_key,
      scoring_jobs.status,
      scoring_jobs.score,
      scoring_jobs.verdict,
      scoring_jobs.segments,
      scoring_jobs.evaluation,
      scoring_jobs.created_at,
      asr_results.word_alignments,
      asr_results.word_timestamps,
      asr_results.wer
    FROM scoring_jobs
    LEFT JOIN asr_results ON asr_results.session_id = scoring_jobs.session_id
    WHERE scoring_jobs.session_id = $1
    `,
    [jobId]
  );

  if (result.rowCount === 0) return null;
  const row = result.rows[0];
  const segments = parseJsonValue<unknown[]>(row.segments, []);
  const evaluation = parseJsonValue<Record<string, unknown> | null>(row.evaluation, null);
  const wordAlignments = parseJsonValue<RawAlignment[]>(row.word_alignments, []);
  const wordTimestamps = parseJsonValue<RawTimestamp[]>(row.word_timestamps, []);
  const wer = numberOrNull(row.wer);

  const feedback = buildPronunciationFeedback(wordAlignments, wordTimestamps, wer);

  return {
    jobId: row.session_id as string,
    uploadKey: row.upload_key as string,
    status: row.status as ScoringResult['status'],
    score: numberOrNull(row.score),
    verdict: row.verdict ?? null,
    segments: Array.isArray(segments) ? (segments as ScoringResult['segments']) : [],
    evaluation,
    createdAt: new Date(row.created_at as Date).toISOString(),
    feedback
  };
};

export const createSignedUploadUrl = async (input: {
  filename: string;
  contentType: string;
  userId: string | null;
}): Promise<{
  sessionId: string;
  uploadKey: string;
  url: string;
  fields: Record<string, unknown>;
  expiresAt: string;
}> => {
  const prefix = uploadPrefix();
  const uploadKey = `${prefix}${Date.now()}-${encodeURIComponent(input.filename)}`;
  const sessionId = randomUUID();
  const expiresIn = uploadTtlSeconds();
  const expiresAt = secondsFromNow(expiresIn);
  const client = getMinioClientForPresignedUrls();
  const bucket = process.env.MINIO_BUCKET;

  if (client && bucket) {
    const url = await client.presignedPutObject(bucket, uploadKey, expiresIn);

    await recordUploadKey({
      sessionId,
      userId: input.userId,
      audioKey: uploadKey,
      expiresAt: new Date(Date.now() + expiresIn * 1000)
    });
    return {
      sessionId,
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
    sessionId,
    userId: input.userId,
    audioKey: uploadKey,
    expiresAt: new Date(Date.now() + expiresIn * 1000)
  });

  return {
    sessionId,
    uploadKey,
    url: `${baseUrl}/${uploadKey}`,
    fields: {
      key: uploadKey,
      'Content-Type': input.contentType
    },
    expiresAt
  };
};
