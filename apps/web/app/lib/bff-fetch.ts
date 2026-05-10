import 'server-only';
import { fetchWithTracing } from '../telemetry/helpers';
import { readAccessToken } from './auth-cookies';

// Wraps fetchWithTracing so every BFF call automatically forwards the
// access cookie as an `Authorization: Bearer` header. The BFF accepts
// either header or cookie, but the bearer form keeps the Web cookie
// surface independent from the BFF's session cookie name.
export const bffFetch = async (
  url: string,
  options?: Parameters<typeof fetch>[1]
): Promise<Response> => {
  const token = await readAccessToken();
  const headers: Record<string, string> = {
    ...((options?.headers as Record<string, string> | undefined) ?? {})
  };
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }
  return fetchWithTracing(url, { ...options, headers });
};
