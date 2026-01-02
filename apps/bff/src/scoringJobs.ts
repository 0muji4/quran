import type { ScoringResult } from '@quran-project/shared-ts';
import { getMinioClientForPresignedUrls, recordUploadKey } from './storage';

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

export const createScoringJob = async (input: {
  uploadKey: string;
  surahId: string;
  ayahNumber?: number | null;
  userId?: string | null;
}): Promise<ScoringResult> => {
  const response = await fetch(`${backendUrl}/api/scoring-jobs`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      uploadKey: input.uploadKey,
      surahId: input.surahId,
      ayahNumber: typeof input.ayahNumber === 'number' ? input.ayahNumber : null,
      userId: input.userId ?? null
    })
  });

  return parseJson<ScoringResult>(response);
};

export const getScoringJob = async (jobId: string): Promise<ScoringResult | null> => {
  const response = await fetch(`${backendUrl}/api/scoring-jobs/${jobId}`);
  if (response.status === 404) return null;
  return parseJson<ScoringResult>(response);
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
  const client = getMinioClientForPresignedUrls();
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
