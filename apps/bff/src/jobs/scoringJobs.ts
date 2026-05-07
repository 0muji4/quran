import { randomUUID } from 'crypto';
import type { PronunciationFeedback, ScoringResult, WordAlignment } from '@quran-project/shared-ts';
import {
  ensureReferenceAudio,
  findSessionIdForUploadKey,
  getDatabasePool,
  getMinioClientForPresignedUrls,
  recordUploadKey
} from '../infra';
import { fetchWithTracing } from '../infra/backendClient';

const secondsFromNow = (seconds: number): string =>
  new Date(Date.now() + seconds * 1000).toISOString();
const uploadPrefix = (): string => process.env.MINIO_UPLOAD_PREFIX ?? 'uploads/';
const uploadTtlSeconds = (): number => Number(process.env.SIGNED_URL_TTL_SECONDS ?? '900');

const backendUrl = process.env.BACKEND_URL ?? 'http://localhost:8080';
const uploadBaseUrl = process.env.UPLOAD_BASE_URL ?? 'https://uploads.local';

const parseJson = async <T>(response: Response): Promise<T> => {
  if (!response.ok) {
    // Try to get error message from response body
    const text = await response.text();
    console.error('Backend error response:', { status: response.status, body: text });
    throw new Error(`Backend returned ${response.status}: ${text}`);
  }

  const payload = (await response.json()) as unknown;
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

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const buildPronunciationFeedback = (
  wordAlignments: RawAlignment[],
  wordTimestamps: RawTimestamp[],
  wer: number | null,
  referenceAudioUrl: string | null
): PronunciationFeedback | null => {
  if (
    wordAlignments.length === 0 &&
    wordTimestamps.length === 0 &&
    wer === null &&
    !referenceAudioUrl
  ) {
    return null;
  }

  const refCount = wordAlignments.filter((alignment) => alignment.ref_word).length;
  const matchCount = wordAlignments.filter((alignment) => alignment.op === 'match').length;
  const substituteCount = wordAlignments.filter(
    (alignment) => alignment.op === 'substitute'
  ).length;
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
    referenceAudioUrl,
    wordAlignments: normalizedAlignments
  };
};

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const createReferenceAudioUrl = async (
  referenceAudioKey: string | null
): Promise<string | null> => {
  if (!referenceAudioKey) return null;
  const client = getMinioClientForPresignedUrls();
  const bucket = process.env.MINIO_BUCKET;
  const expiresIn = uploadTtlSeconds();

  if (client && bucket) {
    return client.presignedGetObject(bucket, referenceAudioKey, expiresIn);
  }

  return `${uploadBaseUrl}/${referenceAudioKey}`;
};

/**
 * Creates a scoring job for Quran recitation analysis
 *
 * @param input.sessionId - Optional session ID (auto-generated if not provided)
 * @param input.uploadKey - S3/MinIO upload key for the audio file
 * @param input.surahId - String representation of Surah ID (valid range: "1" to "114")
 * @param input.ayahNumber - Integer Ayah number (valid range: 1 to 286, varies by surah)
 * @param input.userId - Optional user ID for tracking
 * @returns Promise resolving to ScoringResult with job details and status
 * @throws Error if session ID cannot be found for the upload key
 */
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

  let referenceAudioKey: string | null = null;
  if (typeof input.ayahNumber === 'number') {
    const surahNumeric = Number(input.surahId);
    try {
      const ensured = await ensureReferenceAudio(surahNumeric, input.ayahNumber);
      referenceAudioKey = ensured.key;
    } catch (error) {
      console.error('Failed to ensure reference audio cache', {
        surahId: input.surahId,
        ayahNumber: input.ayahNumber,
        error
      });
      throw error;
    }
  }

  const payload = {
    uploadKey: input.uploadKey,
    sessionId,
    surahId: input.surahId,
    ayahNumber: typeof input.ayahNumber === 'number' ? input.ayahNumber : null,
    userId: input.userId ?? null,
    referenceAudioKey
  };
  console.log('Creating scoring job', {
    sessionId: payload.sessionId,
    surahId: payload.surahId,
    ayahNumber: payload.ayahNumber,
    referenceAudioKey: payload.referenceAudioKey
  });

  const response = await fetchWithTracing(`${backendUrl}/api/scoring-jobs`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(payload)
  });

  return parseJson<ScoringResult>(response);
};

export const getScoringJob = async (jobId: string): Promise<ScoringResult | null> => {
  const pool = getDatabasePool();
  if (!pool) {
    const response = await fetchWithTracing(`${backendUrl}/api/scoring-jobs/${jobId}`);
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
      asr_results.transcript,
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

  // If asr_results exists, the job is completed
  const hasResults = row.transcript !== null;
  const actualStatus = hasResults ? 'COMPLETED' : row.status;

  // Build feedback from asr_results if available
  const feedback = hasResults
    ? {
        accuracy: row.wer !== null ? Math.max(0, Math.min(1, 1 - parseFloat(row.wer))) : 0,
        fluency: 0, // Will be calculated from word_timestamps in future
        completeness: 0, // Will be calculated in future
        overall: 0, // Will be calculated in future
        referenceAudioUrl: null,
        wordAlignments: [],
        transcript: row.transcript as string,
        wer: row.wer !== null ? parseFloat(row.wer) : null
      }
    : null;

  return {
    jobId: row.session_id as string,
    uploadKey: row.upload_key as string,
    status: actualStatus as ScoringResult['status'],
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

  await recordUploadKey({
    sessionId,
    userId: input.userId,
    audioKey: uploadKey,
    expiresAt: new Date(Date.now() + expiresIn * 1000)
  });

  return {
    sessionId,
    uploadKey,
    url: `${uploadBaseUrl}/${uploadKey}`,
    fields: {
      key: uploadKey,
      'Content-Type': input.contentType
    },
    expiresAt
  };
};
