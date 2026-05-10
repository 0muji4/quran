'use server';

import type { AyahRecord, SurahSummary } from './lib/types';
import type { Attempt, BestScoreEntry, BestScores, LastPracticed } from './lib/storage-types';
import type { ScoringResult, SignedUploadUrl } from '@quran-project/shared-ts';
import 'server-only';
import { bffFetch } from './lib/bff-fetch';
import { clearAuthCookies, setAuthCookies } from './lib/auth-cookies';
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

        const response = await bffFetch(`${BFF_BASE_URL}/signed-upload-url`, {
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

        const response = await bffFetch(`${BFF_BASE_URL}/scoring-jobs`, {
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

        const response = await bffFetch(`${BFF_BASE_URL}/scoring-jobs/${jobId}`, withNoStore);

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

        const response = await bffFetch(`${BFF_BASE_URL}/rsc/surahs`, withNoStore);
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

export const fetchReferenceAudioUrl = async (
  surahId: number,
  ayahNumber: number
): Promise<{ url: string; expiresAt: string }> => {
  return tracer.startActiveSpan(
    'ServerAction: fetchReferenceAudioUrl',
    { kind: SpanKind.CLIENT },
    async (span) => {
      try {
        span.setAttribute('action.name', 'fetchReferenceAudioUrl');
        span.setAttribute('action.surahId', surahId);
        span.setAttribute('action.ayahNumber', ayahNumber);

        const response = await bffFetch(
          `${BFF_BASE_URL}/reference-audio?surah=${surahId}&ayah=${ayahNumber}`,
          withNoStore
        );

        const result = await parseJson<{ url: string; expiresAt: string }>(response);
        span.setStatus({ code: SpanStatusCode.OK });
        return result;
      } catch (error) {
        span.recordException(error as Error);
        span.setStatus({
          code: SpanStatusCode.ERROR,
          message: (error as Error).message
        });
        logger.error('fetchReferenceAudioUrl failed', {
          error: (error as Error).message,
          surahId,
          ayahNumber
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

        const response = await bffFetch(`${BFF_BASE_URL}/rsc/surah/${surahId}/ayahs`, withNoStore);
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

// /me persistence endpoints (ADR 0011). Each Server Action wraps the
// BFF call in the same span / log shape as the surrounding actions so
// the OTel pipeline keeps a uniform view.

export const fetchLastPracticedFromBff = async (): Promise<LastPracticed | null> => {
  return tracer.startActiveSpan(
    'ServerAction: fetchLastPracticedFromBff',
    { kind: SpanKind.CLIENT },
    async (span) => {
      try {
        span.setAttribute('action.name', 'fetchLastPracticedFromBff');
        const response = await bffFetch(`${BFF_BASE_URL}/me/last-practiced`, withNoStore);
        const payload = await parseJson<LastPracticed | null>(response);
        span.setStatus({ code: SpanStatusCode.OK });
        return payload;
      } catch (error) {
        span.recordException(error as Error);
        span.setStatus({ code: SpanStatusCode.ERROR, message: (error as Error).message });
        logger.error('fetchLastPracticedFromBff failed', { error: (error as Error).message });
        throw error;
      } finally {
        span.end();
      }
    }
  );
};

export const putLastPracticedToBff = async (entry: LastPracticed): Promise<LastPracticed> => {
  return tracer.startActiveSpan(
    'ServerAction: putLastPracticedToBff',
    { kind: SpanKind.CLIENT },
    async (span) => {
      try {
        span.setAttribute('action.name', 'putLastPracticedToBff');
        const response = await bffFetch(`${BFF_BASE_URL}/me/last-practiced`, {
          method: 'PUT',
          cache: 'no-store',
          headers: jsonHeaders,
          body: JSON.stringify(entry)
        });
        const payload = await parseJson<LastPracticed>(response);
        span.setStatus({ code: SpanStatusCode.OK });
        return payload;
      } catch (error) {
        span.recordException(error as Error);
        span.setStatus({ code: SpanStatusCode.ERROR, message: (error as Error).message });
        logger.error('putLastPracticedToBff failed', { error: (error as Error).message });
        throw error;
      } finally {
        span.end();
      }
    }
  );
};

export const fetchBestScoresFromBff = async (): Promise<BestScores> => {
  return tracer.startActiveSpan(
    'ServerAction: fetchBestScoresFromBff',
    { kind: SpanKind.CLIENT },
    async (span) => {
      try {
        span.setAttribute('action.name', 'fetchBestScoresFromBff');
        const response = await bffFetch(`${BFF_BASE_URL}/me/best-scores`, withNoStore);
        const payload = await parseJson<BestScores>(response);
        span.setStatus({ code: SpanStatusCode.OK });
        return payload;
      } catch (error) {
        span.recordException(error as Error);
        span.setStatus({ code: SpanStatusCode.ERROR, message: (error as Error).message });
        logger.error('fetchBestScoresFromBff failed', { error: (error as Error).message });
        throw error;
      } finally {
        span.end();
      }
    }
  );
};

export const putBestScoreToBff = async (
  surahId: string,
  ayahNumber: number,
  entry: BestScoreEntry
): Promise<BestScoreEntry> => {
  return tracer.startActiveSpan(
    'ServerAction: putBestScoreToBff',
    { kind: SpanKind.CLIENT },
    async (span) => {
      try {
        span.setAttribute('action.name', 'putBestScoreToBff');
        span.setAttribute('action.surahId', surahId);
        span.setAttribute('action.ayahNumber', ayahNumber);
        const key = `${surahId}:${ayahNumber}`;
        const response = await bffFetch(
          `${BFF_BASE_URL}/me/best-scores/${encodeURIComponent(key)}`,
          {
            method: 'PUT',
            cache: 'no-store',
            headers: jsonHeaders,
            body: JSON.stringify(entry)
          }
        );
        const payload = await parseJson<BestScoreEntry>(response);
        span.setStatus({ code: SpanStatusCode.OK });
        return payload;
      } catch (error) {
        span.recordException(error as Error);
        span.setStatus({ code: SpanStatusCode.ERROR, message: (error as Error).message });
        logger.error('putBestScoreToBff failed', { error: (error as Error).message });
        throw error;
      } finally {
        span.end();
      }
    }
  );
};

export const fetchAttemptsFromBff = async (limit = 50): Promise<Attempt[]> => {
  return tracer.startActiveSpan(
    'ServerAction: fetchAttemptsFromBff',
    { kind: SpanKind.CLIENT },
    async (span) => {
      try {
        span.setAttribute('action.name', 'fetchAttemptsFromBff');
        span.setAttribute('action.limit', limit);
        const response = await bffFetch(`${BFF_BASE_URL}/me/attempts?limit=${limit}`, withNoStore);
        const payload = await parseJson<{ attempts: Attempt[] }>(response);
        span.setStatus({ code: SpanStatusCode.OK });
        return payload.attempts;
      } catch (error) {
        span.recordException(error as Error);
        span.setStatus({ code: SpanStatusCode.ERROR, message: (error as Error).message });
        logger.error('fetchAttemptsFromBff failed', { error: (error as Error).message });
        throw error;
      } finally {
        span.end();
      }
    }
  );
};

export const postAttemptToBff = async (attempt: Attempt): Promise<Attempt> => {
  return tracer.startActiveSpan(
    'ServerAction: postAttemptToBff',
    { kind: SpanKind.CLIENT },
    async (span) => {
      try {
        span.setAttribute('action.name', 'postAttemptToBff');
        const response = await bffFetch(`${BFF_BASE_URL}/me/attempts`, {
          method: 'POST',
          cache: 'no-store',
          headers: jsonHeaders,
          body: JSON.stringify(attempt)
        });
        const payload = await parseJson<Attempt>(response);
        span.setStatus({ code: SpanStatusCode.OK });
        return payload;
      } catch (error) {
        span.recordException(error as Error);
        span.setStatus({ code: SpanStatusCode.ERROR, message: (error as Error).message });
        logger.error('postAttemptToBff failed', { error: (error as Error).message });
        throw error;
      } finally {
        span.end();
      }
    }
  );
};

// /auth credential endpoints (ADR 0010). The Web layer keeps the access /
// refresh tokens in HttpOnly cookies and forwards the access cookie to the
// BFF as `Authorization: Bearer …` via bffFetch.

export type AuthSessionUser = { id: string; email: string; displayName: string | null };

type AuthSuccessPayload = {
  accessToken: string;
  refreshToken: string;
  user: AuthSessionUser;
};

const persistAuthSession = async (payload: AuthSuccessPayload): Promise<AuthSessionUser> => {
  await setAuthCookies({
    accessToken: payload.accessToken,
    refreshToken: payload.refreshToken
  });
  return payload.user;
};

export const signUpAction = async (input: {
  email: string;
  password: string;
  displayName?: string;
}): Promise<AuthSessionUser> => {
  return tracer.startActiveSpan(
    'ServerAction: signUpAction',
    { kind: SpanKind.CLIENT },
    async (span) => {
      try {
        span.setAttribute('action.name', 'signUpAction');
        const response = await bffFetch(`${BFF_BASE_URL}/auth/signup`, {
          method: 'POST',
          cache: 'no-store',
          headers: jsonHeaders,
          body: JSON.stringify(input)
        });
        const payload = await parseJson<AuthSuccessPayload>(response);
        const user = await persistAuthSession(payload);
        logger.info('signUpAction completed', { userId: user.id });
        span.setStatus({ code: SpanStatusCode.OK });
        return user;
      } catch (error) {
        span.recordException(error as Error);
        span.setStatus({ code: SpanStatusCode.ERROR, message: (error as Error).message });
        logger.error('signUpAction failed', { error: (error as Error).message });
        throw error;
      } finally {
        span.end();
      }
    }
  );
};

export const signInAction = async (input: {
  email: string;
  password: string;
}): Promise<AuthSessionUser> => {
  return tracer.startActiveSpan(
    'ServerAction: signInAction',
    { kind: SpanKind.CLIENT },
    async (span) => {
      try {
        span.setAttribute('action.name', 'signInAction');
        const response = await bffFetch(`${BFF_BASE_URL}/auth/login`, {
          method: 'POST',
          cache: 'no-store',
          headers: jsonHeaders,
          body: JSON.stringify(input)
        });
        const payload = await parseJson<AuthSuccessPayload>(response);
        const user = await persistAuthSession(payload);
        logger.info('signInAction completed', { userId: user.id });
        span.setStatus({ code: SpanStatusCode.OK });
        return user;
      } catch (error) {
        span.recordException(error as Error);
        span.setStatus({ code: SpanStatusCode.ERROR, message: (error as Error).message });
        logger.error('signInAction failed', { error: (error as Error).message });
        throw error;
      } finally {
        span.end();
      }
    }
  );
};

export const signOutAction = async (): Promise<void> => {
  return tracer.startActiveSpan(
    'ServerAction: signOutAction',
    { kind: SpanKind.CLIENT },
    async (span) => {
      try {
        span.setAttribute('action.name', 'signOutAction');
        await clearAuthCookies();
        span.setStatus({ code: SpanStatusCode.OK });
      } catch (error) {
        span.recordException(error as Error);
        span.setStatus({ code: SpanStatusCode.ERROR, message: (error as Error).message });
        logger.error('signOutAction failed', { error: (error as Error).message });
        throw error;
      } finally {
        span.end();
      }
    }
  );
};
