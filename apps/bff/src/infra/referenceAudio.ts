import { Buffer } from 'node:buffer';
import { everyAyahSourceUrl, referenceAudioKey } from '@quran-project/shared-ts';
import { getMinioClient, getMinioClientForPresignedUrls } from './storage';

export class ReferenceUnavailableError extends Error {
  constructor(
    public readonly surahId: number,
    public readonly ayahNumber: number
  ) {
    super(`reference audio not available for surah=${surahId}, ayah=${ayahNumber}`);
    this.name = 'ReferenceUnavailableError';
  }
}

export class ReferenceFetchError extends Error {
  constructor(
    message: string,
    public override readonly cause?: unknown
  ) {
    super(message);
    this.name = 'ReferenceFetchError';
  }
}

const FETCH_TIMEOUT_MS = 10_000;
const MAX_RETRIES = 3;
const DEFAULT_TTL_SECONDS = 900;

const ttlSeconds = (): number => Number(process.env.SIGNED_URL_TTL_SECONDS ?? DEFAULT_TTL_SECONDS);

const isNotFound = (error: unknown): boolean => {
  const code = (error as { code?: string } | null)?.code ?? '';
  return code === 'NotFound' || code === 'NoSuchKey';
};

const downloadFromEveryAyah = async (surahId: number, ayahNumber: number): Promise<Buffer> => {
  const url = everyAyahSourceUrl(surahId, ayahNumber);
  let lastError: unknown;
  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    if (attempt > 0) {
      await new Promise((r) => setTimeout(r, 250 * 2 ** (attempt - 1)));
    }
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
    try {
      const response = await fetch(url, { signal: controller.signal });
      if (response.status === 404) {
        throw new ReferenceUnavailableError(surahId, ayahNumber);
      }
      if (!response.ok) {
        throw new ReferenceFetchError(`upstream ${response.status} from EveryAyah`);
      }
      const arrayBuffer = await response.arrayBuffer();
      return Buffer.from(arrayBuffer);
    } catch (error) {
      if (error instanceof ReferenceUnavailableError) throw error;
      lastError = error;
    } finally {
      clearTimeout(timer);
    }
  }
  throw new ReferenceFetchError(
    `failed to fetch reference audio after ${MAX_RETRIES} attempts`,
    lastError
  );
};

export interface ReferenceAudioResult {
  key: string;
  signedUrl: string;
  expiresAt: string;
}

export const ensureReferenceAudio = async (
  surahId: number,
  ayahNumber: number
): Promise<ReferenceAudioResult> => {
  const key = referenceAudioKey(surahId, ayahNumber);
  const bucket = process.env.MINIO_BUCKET;
  const internal = getMinioClient();
  const external = getMinioClientForPresignedUrls();

  if (!bucket || !internal || !external) {
    throw new ReferenceFetchError('MinIO is not configured');
  }

  let cached = false;
  try {
    await internal.statObject(bucket, key);
    cached = true;
  } catch (error) {
    if (!isNotFound(error)) {
      throw new ReferenceFetchError('failed to stat reference audio', error);
    }
  }

  if (!cached) {
    const body = await downloadFromEveryAyah(surahId, ayahNumber);
    await internal.putObject(bucket, key, body, body.length, {
      'Content-Type': 'audio/mpeg'
    });
  }

  const expires = ttlSeconds();
  const signedUrl = await external.presignedGetObject(bucket, key, expires);
  const expiresAt = new Date(Date.now() + expires * 1000).toISOString();
  return { key, signedUrl, expiresAt };
};
