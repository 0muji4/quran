import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ACCESS_COOKIE, REFRESH_COOKIE } from '../auth-cookies';
import { bffFetch } from '../bff-fetch';
import { __resetCookies, cookies } from '../../../test/mocks/next-headers';

// bffFetch wraps fetchWithTracing which itself calls global fetch.
// Mocking global fetch covers the whole pipeline.
global.fetch = vi.fn();

type Init = Parameters<typeof fetch>[1];

const makeResponse = (status: number, body: unknown): Response =>
  ({
    status,
    ok: status >= 200 && status < 300,
    statusText: '',
    json: async () => body
  }) as unknown as Response;

const authorizationFrom = (init: Init): string | undefined =>
  (init?.headers as Record<string, string> | undefined)?.Authorization;

describe('bffFetch', () => {
  beforeEach(() => {
    __resetCookies();
    vi.mocked(fetch).mockReset();
  });

  it('forwards the access cookie as Authorization: Bearer', async () => {
    const store = await cookies();
    store.set(ACCESS_COOKIE, 'access-1');
    vi.mocked(fetch).mockResolvedValueOnce(makeResponse(200, { ok: true }));

    await bffFetch('http://bff/me/last-practiced');

    expect(fetch).toHaveBeenCalledTimes(1);
    expect(authorizationFrom(vi.mocked(fetch).mock.calls[0][1])).toBe('Bearer access-1');
  });

  it('omits Authorization when no access cookie is set', async () => {
    vi.mocked(fetch).mockResolvedValueOnce(makeResponse(200, {}));

    await bffFetch('http://bff/me/last-practiced');

    expect(authorizationFrom(vi.mocked(fetch).mock.calls[0][1])).toBeUndefined();
  });

  it('on 401, refreshes with the refresh cookie and retries with the new token', async () => {
    const store = await cookies();
    store.set(ACCESS_COOKIE, 'expired');
    store.set(REFRESH_COOKIE, 'r-1');
    vi.mocked(fetch)
      .mockResolvedValueOnce(makeResponse(401, {})) // initial
      .mockResolvedValueOnce(makeResponse(200, { accessToken: 'access-2', refreshToken: 'r-2' })) // /auth/refresh
      .mockResolvedValueOnce(makeResponse(200, { ok: true })); // retry

    const response = await bffFetch('http://bff/me/last-practiced');

    expect(response.status).toBe(200);
    expect(fetch).toHaveBeenCalledTimes(3);
    expect(authorizationFrom(vi.mocked(fetch).mock.calls[2][1])).toBe('Bearer access-2');
    // Both cookies are rotated — the BFF rotates the refresh token on
    // every successful /auth/refresh.
    expect(store.get(ACCESS_COOKIE)?.value).toBe('access-2');
    expect(store.get(REFRESH_COOKIE)?.value).toBe('r-2');
  });

  it('on 401, treats a refresh response missing the new refresh token as a failure', async () => {
    const store = await cookies();
    store.set(ACCESS_COOKIE, 'expired');
    store.set(REFRESH_COOKIE, 'r-1');
    vi.mocked(fetch)
      .mockResolvedValueOnce(makeResponse(401, {}))
      // BFF must always return both tokens; a malformed payload is
      // indistinguishable from a server bug and we must not retry on it.
      .mockResolvedValueOnce(makeResponse(200, { accessToken: 'access-2' }));

    const response = await bffFetch('http://bff/me/last-practiced');

    expect(response.status).toBe(401);
    expect(fetch).toHaveBeenCalledTimes(2);
    expect(store.get(ACCESS_COOKIE)).toBeUndefined();
    expect(store.get(REFRESH_COOKIE)).toBeUndefined();
  });

  it('on 401 with no refresh cookie, returns the 401 and clears auth cookies', async () => {
    const store = await cookies();
    store.set(ACCESS_COOKIE, 'expired');
    vi.mocked(fetch).mockResolvedValueOnce(makeResponse(401, {}));

    const response = await bffFetch('http://bff/me/last-practiced');

    expect(response.status).toBe(401);
    expect(fetch).toHaveBeenCalledTimes(1);
    expect(store.get(ACCESS_COOKIE)).toBeUndefined();
  });

  it('on 401 with the BFF rejecting the refresh, clears cookies and returns 401', async () => {
    const store = await cookies();
    store.set(ACCESS_COOKIE, 'expired');
    store.set(REFRESH_COOKIE, 'r-bad');
    vi.mocked(fetch)
      .mockResolvedValueOnce(makeResponse(401, {}))
      .mockResolvedValueOnce(makeResponse(401, { error: 'invalid refresh token' }));

    const response = await bffFetch('http://bff/me/last-practiced');

    expect(response.status).toBe(401);
    expect(fetch).toHaveBeenCalledTimes(2);
    expect(store.get(ACCESS_COOKIE)).toBeUndefined();
    expect(store.get(REFRESH_COOKIE)).toBeUndefined();
  });

  it('on 401 from an /auth/* endpoint, does not attempt refresh and leaves cookies alone', async () => {
    // /auth/login 401 means "wrong password", not "session expired".
    // The refresh path must not fire on auth endpoints — both to avoid
    // a spurious /auth/refresh on every failed sign-in, and to keep
    // /auth/refresh itself from recursing.
    const store = await cookies();
    store.set(REFRESH_COOKIE, 'r-1');
    vi.mocked(fetch).mockResolvedValueOnce(
      makeResponse(401, { error: 'invalid email or password' })
    );

    const response = await bffFetch('http://bff/auth/login');

    expect(response.status).toBe(401);
    expect(fetch).toHaveBeenCalledTimes(1);
    expect(store.get(REFRESH_COOKIE)?.value).toBe('r-1');
  });
});
