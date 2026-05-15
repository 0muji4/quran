import 'server-only';
import { fetchWithTracing } from '../telemetry/helpers';
import { logger } from '../telemetry/logger';
import {
  clearAuthCookies,
  readAccessToken,
  readRefreshToken,
  setAuthCookies
} from './auth-cookies';

// Inlined to keep this module independent of `actions.ts` (which is
// `'use server'`). Matches the value used there.
const BFF_BASE_URL = process.env.BFF_BASE_URL ?? 'http://localhost:4000';

// Wraps fetchWithTracing so every BFF call automatically forwards the
// access cookie as an `Authorization: Bearer` header. On a 401 we
// attempt the `/auth/refresh` flow exactly once: if it succeeds we
// retry the original request with the new access token, otherwise we
// clear the auth cookies so subsequent server renders see the user as
// signed out instead of looping on stale credentials.
//
// `/auth/*` endpoints are skipped from the refresh path — a 401 from
// `/auth/login` is the "wrong password" signal, not "session expired",
// and `/auth/refresh` itself must never recurse through bffFetch.
export const bffFetch = async (
  url: string,
  options?: Parameters<typeof fetch>[1]
): Promise<Response> => {
  const initialToken = await readAccessToken();
  const initial = await fetchWithBearer(url, options, initialToken);
  if (initial.status !== 401 || isAuthEndpoint(url)) return initial;

  const refreshed = await tryRefreshAccessToken();
  if (!refreshed) {
    // Refresh missing or rejected — drop the stale cookies. The next
    // server render will flip the session UI to signed-out rather than
    // silently 401-looping on every BFF call.
    await clearAuthCookies();
    return initial;
  }
  return fetchWithBearer(url, options, refreshed);
};

const fetchWithBearer = async (
  url: string,
  options: Parameters<typeof fetch>[1] | undefined,
  accessToken: string | null
): Promise<Response> => {
  const headers: Record<string, string> = {
    ...((options?.headers as Record<string, string> | undefined) ?? {})
  };
  if (accessToken) {
    headers.Authorization = `Bearer ${accessToken}`;
  }
  return fetchWithTracing(url, { ...options, headers });
};

const isAuthEndpoint = (url: string): boolean => url.includes('/auth/');

// Exchange the refresh cookie for a fresh access + refresh pair and
// persist both back to the cookie store. Returns the new access token,
// or `null` if no refresh cookie is set or the BFF rejected it. The BFF
// rotates the refresh token on every successful call — see the
// refresh-token rotation flow in apps/bff/src/rest/rest.ts.
const tryRefreshAccessToken = async (): Promise<string | null> => {
  const refreshToken = await readRefreshToken();
  if (!refreshToken) return null;
  try {
    const response = await fetchWithTracing(`${BFF_BASE_URL}/auth/refresh`, {
      method: 'POST',
      cache: 'no-store',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken })
    });
    if (!response.ok) return null;
    const payload = (await response.json()) as {
      accessToken?: unknown;
      refreshToken?: unknown;
    };
    if (
      typeof payload.accessToken !== 'string' ||
      payload.accessToken.length === 0 ||
      typeof payload.refreshToken !== 'string' ||
      payload.refreshToken.length === 0
    ) {
      return null;
    }
    await setAuthCookies({
      accessToken: payload.accessToken,
      refreshToken: payload.refreshToken
    });
    return payload.accessToken;
  } catch (error) {
    logger.error('bffFetch: refresh failed', { error: (error as Error).message });
    return null;
  }
};
