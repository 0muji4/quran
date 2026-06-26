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

interface RawAlignment {
  ref_word?: string | null;
  hyp_word?: string | null;
  op?: string | null;
}

// Projects the backend's persisted `evaluation` blob (accuracy / fluency /
// completeness / wer / transcript / alignments) plus the job's overall
// `score` into the GraphQL PronunciationFeedback the clients render. The
// backend pre-computes every dimension, so this is a pure projection — it
// does NOT re-derive scores from raw word timestamps (the old asr_results
// path that left every dimension at zero). Returns null when the job has no
// evaluation yet (still RUNNING) or failed.
export const mapEvaluationToFeedback = (
  evaluation: Record<string, unknown> | null,
  overall: number | null,
  referenceAudioUrl: string | null
): PronunciationFeedback | null => {
  if (!evaluation) return null;

  const rawAlignments = Array.isArray(evaluation.alignments)
    ? (evaluation.alignments as RawAlignment[])
    : [];
  const wordAlignments: WordAlignment[] = rawAlignments.map((alignment) => ({
    refWord: alignment.ref_word ?? null,
    hypWord: alignment.hyp_word ?? null,
    op: alignment.op ?? 'match'
  }));

  return {
    accuracy: clampScore(numberOrNull(evaluation.accuracy) ?? 0),
    fluency: clampScore(numberOrNull(evaluation.fluency) ?? 0),
    completeness: clampScore(numberOrNull(evaluation.completeness) ?? 0),
    overall: clampScore(overall ?? 0),
    referenceAudioUrl,
    transcript: typeof evaluation.transcript === 'string' ? evaluation.transcript : null,
    wer: numberOrNull(evaluation.wer),
    cer: numberOrNull(evaluation.cer),
    wordAlignments
  };
};

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

// Creates a presigned download URL for a user's recording so the result page
// can play it back. Returns null when MinIO is not configured (e.g. during
// some local-only modes); the consumer hides the player gracefully.
const createRecordingUrl = async (uploadKey: string | null): Promise<string | null> => {
  if (!uploadKey) return null;
  const client = getMinioClientForPresignedUrls();
  const bucket = process.env.MINIO_BUCKET;
  const expiresIn = uploadTtlSeconds();

  if (client && bucket) {
    try {
      return await client.presignedGetObject(bucket, uploadKey, expiresIn);
    } catch (error) {
      console.warn('Failed to presign recording URL', { uploadKey, error });
      return null;
    }
  }

  return `${uploadBaseUrl}/${uploadKey}`;
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

  const result = await parseJson<ScoringResult>(response);
  // The Go backend doesn't sign download URLs nor shape PronunciationFeedback;
  // enrich here so the immediate post-create response (which the web caller
  // drops straight into the result-page redirect) already has a playable
  // recording URL and the full feedback breakdown, with no second fetch.
  result.recordingUrl = await createRecordingUrl(result.uploadKey ?? input.uploadKey);
  result.feedback = mapEvaluationToFeedback(
    (result.evaluation as Record<string, unknown> | null) ?? null,
    result.score ?? null,
    await createReferenceAudioUrl(referenceAudioKey)
  );
  return result;
};

export const getScoringJob = async (jobId: string): Promise<ScoringResult | null> => {
  const pool = getDatabasePool();
  if (!pool) {
    const response = await fetchWithTracing(`${backendUrl}/api/scoring-jobs/${jobId}`);
    if (response.status === 404) return null;
    const result = await parseJson<ScoringResult>(response);
    result.recordingUrl = await createRecordingUrl(result.uploadKey);
    // The Go REST response carries the raw `evaluation` blob but no presigned
    // reference key, so referenceAudioUrl stays null on this fallback path
    // (clients fetch the teacher clip via /reference-audio instead).
    result.feedback = mapEvaluationToFeedback(
      (result.evaluation as Record<string, unknown> | null) ?? null,
      result.score ?? null,
      null
    );
    return result;
  }

  const result = await pool.query(
    `
    SELECT
      session_id,
      upload_key,
      status,
      score,
      verdict,
      segments,
      evaluation,
      reference_audio_key,
      created_at
    FROM scoring_jobs
    WHERE session_id = $1
    `,
    [jobId]
  );

  if (result.rowCount === 0) return null;
  const row = result.rows[0];
  const segments = parseJsonValue<unknown[]>(row.segments, []);
  const evaluation = parseJsonValue<Record<string, unknown> | null>(row.evaluation, null);
  const score = numberOrNull(row.score);

  const referenceAudioUrl = await createReferenceAudioUrl(row.reference_audio_key ?? null);
  const feedback = mapEvaluationToFeedback(evaluation, score, referenceAudioUrl);

  const uploadKey = row.upload_key as string;
  const recordingUrl = await createRecordingUrl(uploadKey);

  return {
    jobId: row.session_id as string,
    uploadKey,
    recordingUrl,
    status: row.status as ScoringResult['status'],
    score,
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
