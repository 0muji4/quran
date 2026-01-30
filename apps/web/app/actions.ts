'use server';

import type { AyahRecord, SurahSummary } from './lib/types';
import type { ScoringResult, SignedUploadUrl } from '@quran-project/shared-ts';
import 'server-only';
import { fetchWithTracing } from './telemetry/helpers';
import { logger } from './telemetry/logger';
import { tracer } from './telemetry/telemetry';
import { SpanKind, SpanStatusCode } from '@opentelemetry/api';

type SignedUploadResponse = SignedUploadUrl & { uploadKey?: string; sessionId?: string };

const BFF_BASE_URL = process.env.BFF_BASE_URL ?? 'http://localhost:4000';

const jsonHeaders = {
  'Content-Type': 'application/json'
};

// eslint-disable-next-line no-undef
const withNoStore: RequestInit = {
  cache: 'no-store',
  headers: jsonHeaders
};

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

export const requestSignedUploadUrl = async (input: {
  filename: string;
  contentType: string;
}): Promise<SignedUploadResponse> => {
  return tracer.startActiveSpan(
    'ServerAction: requestSignedUploadUrl',
    { kind: SpanKind.CLIENT },
    async (span) => {
      try {
        span.setAttribute('action.name', 'requestSignedUploadUrl');
        span.setAttribute('action.filename', input.filename);
        span.setAttribute('action.contentType', input.contentType);

        const response = await fetchWithTracing(`${BFF_BASE_URL}/signed-upload-url`, {
          ...withNoStore,
          method: 'POST',
          body: JSON.stringify(input)
        });

        const result = await parseJson<SignedUploadResponse>(response);

        logger.info('requestSignedUploadUrl completed', {
          filename: input.filename,
          uploadKey: result.uploadKey
        });

        span.setStatus({ code: SpanStatusCode.OK });
        return result;
      } catch (error) {
        span.recordException(error as Error);
        span.setStatus({
          code: SpanStatusCode.ERROR,
          message: (error as Error).message
        });
        logger.error('requestSignedUploadUrl failed', {
          error: (error as Error).message,
          filename: input.filename
        });
        throw error;
      } finally {
        span.end();
      }
    }
  );
};

export const createScoringJobFromUpload = async (input: {
  sessionId?: string;
  uploadKey: string;
  surahId: string;
  ayahNumber: number;
}): Promise<ScoringResult> => {
  return tracer.startActiveSpan(
    'ServerAction: createScoringJobFromUpload',
    { kind: SpanKind.CLIENT },
    async (span) => {
      try {
        span.setAttribute('action.name', 'createScoringJobFromUpload');
        span.setAttribute('action.surahId', input.surahId);
        span.setAttribute('action.ayahNumber', input.ayahNumber);
        span.setAttribute('action.uploadKey', input.uploadKey);

        const response = await fetchWithTracing(`${BFF_BASE_URL}/scoring-jobs`, {
          ...withNoStore,
          method: 'POST',
          body: JSON.stringify(input)
        });

        const result = await parseJson<ScoringResult>(response);

        logger.info('createScoringJobFromUpload completed', {
          uploadKey: input.uploadKey,
          jobId: result.jobId
        });

        span.setStatus({ code: SpanStatusCode.OK });
        return result;
      } catch (error) {
        span.recordException(error as Error);
        span.setStatus({
          code: SpanStatusCode.ERROR,
          message: (error as Error).message
        });
        logger.error('createScoringJobFromUpload failed', {
          error: (error as Error).message,
          uploadKey: input.uploadKey
        });
        throw error;
      } finally {
        span.end();
      }
    }
  );
};

export const fetchScoringJob = async (jobId: string): Promise<ScoringResult> => {
  return tracer.startActiveSpan(
    'ServerAction: fetchScoringJob',
    { kind: SpanKind.CLIENT },
    async (span) => {
      try {
        span.setAttribute('action.name', 'fetchScoringJob');
        span.setAttribute('action.jobId', jobId);

        const response = await fetchWithTracing(
          `${BFF_BASE_URL}/scoring-jobs/${jobId}`,
          withNoStore
        );

        const result = await parseJson<ScoringResult>(response);

        logger.info('fetchScoringJob completed', {
          jobId,
          status: result.status
        });

        span.setStatus({ code: SpanStatusCode.OK });
        return result;
      } catch (error) {
        span.recordException(error as Error);
        span.setStatus({
          code: SpanStatusCode.ERROR,
          message: (error as Error).message
        });
        logger.error('fetchScoringJob failed', {
          error: (error as Error).message,
          jobId
        });
        throw error;
      } finally {
        span.end();
      }
    }
  );
};

export const fetchSurahs = async (): Promise<SurahSummary[]> => {
  return tracer.startActiveSpan(
    'ServerAction: fetchSurahs',
    { kind: SpanKind.CLIENT },
    async (span) => {
      try {
        span.setAttribute('action.name', 'fetchSurahs');

        const response = await fetchWithTracing(`${BFF_BASE_URL}/rsc/surahs`, withNoStore);
        const payload = await parseJson<{ surahs: SurahSummary[] }>(response);

        span.setAttribute('action.resultCount', payload.surahs.length);

        logger.info('fetchSurahs completed', {
          count: payload.surahs.length
        });

        span.setStatus({ code: SpanStatusCode.OK });
        return payload.surahs;
      } catch (error) {
        span.recordException(error as Error);
        span.setStatus({
          code: SpanStatusCode.ERROR,
          message: (error as Error).message
        });
        logger.error('fetchSurahs failed', {
          error: (error as Error).message
        });
        throw error;
      } finally {
        span.end();
      }
    }
  );
};

export const fetchSurahAyahs = async (surahId: string): Promise<AyahRecord[]> => {
  return tracer.startActiveSpan(
    'ServerAction: fetchSurahAyahs',
    { kind: SpanKind.CLIENT },
    async (span) => {
      try {
        span.setAttribute('action.name', 'fetchSurahAyahs');
        span.setAttribute('action.surahId', surahId);

        const response = await fetchWithTracing(
          `${BFF_BASE_URL}/rsc/surah/${surahId}/ayahs`,
          withNoStore
        );
        const payload = await parseJson<{ ayahs: AyahRecord[] }>(response);

        span.setAttribute('action.resultCount', payload.ayahs.length);

        logger.info('fetchSurahAyahs completed', {
          surahId,
          count: payload.ayahs.length
        });

        span.setStatus({ code: SpanStatusCode.OK });
        return payload.ayahs;
      } catch (error) {
        span.recordException(error as Error);
        span.setStatus({
          code: SpanStatusCode.ERROR,
          message: (error as Error).message
        });
        logger.error('fetchSurahAyahs failed', {
          error: (error as Error).message,
          surahId
        });
        throw error;
      } finally {
        span.end();
      }
    }
  );
};
