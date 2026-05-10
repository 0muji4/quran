import 'server-only';
import { cookies } from 'next/headers';

// Cookie names used by the Web layer. The BFF accepts an Authorization
// bearer header (or its own cookie via SESSION_COOKIE_NAME); Server
// Actions translate the access cookie into the bearer header so the
// Web cookie surface is independent of the BFF's.
export const ACCESS_COOKIE = 'tilawah-access';
export const REFRESH_COOKIE = 'tilawah-refresh';

const ACCESS_MAX_AGE_S = 15 * 60; // 15 min
const REFRESH_MAX_AGE_S = 30 * 24 * 60 * 60; // 30 days

const isProd = (): boolean => process.env.NODE_ENV === 'production';

export const setAuthCookies = async (input: {
  accessToken: string;
  refreshToken: string;
}): Promise<void> => {
  const store = await cookies();
  const baseOptions = {
    httpOnly: true,
    secure: isProd(),
    sameSite: 'lax' as const,
    path: '/'
  };
  store.set(ACCESS_COOKIE, input.accessToken, {
    ...baseOptions,
    maxAge: ACCESS_MAX_AGE_S
  });
  store.set(REFRESH_COOKIE, input.refreshToken, {
    ...baseOptions,
    maxAge: REFRESH_MAX_AGE_S
  });
};

export const clearAuthCookies = async (): Promise<void> => {
  const store = await cookies();
  store.delete(ACCESS_COOKIE);
  store.delete(REFRESH_COOKIE);
};

export const readAccessToken = async (): Promise<string | null> => {
  const store = await cookies();
  return store.get(ACCESS_COOKIE)?.value ?? null;
};

export const readRefreshToken = async (): Promise<string | null> => {
  const store = await cookies();
  return store.get(REFRESH_COOKIE)?.value ?? null;
};
