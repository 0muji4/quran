import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { ACCESS_COOKIE } from '../auth-cookies';
import { getCurrentSession, initialFor } from '../session';
import { __resetCookies, cookies } from '../../../test/mocks/next-headers';

const fakeJwt = (payload: Record<string, unknown>): string => {
  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
  const body = Buffer.from(JSON.stringify(payload)).toString('base64url');
  return `${header}.${body}.signature`;
};

describe('session', () => {
  beforeEach(() => {
    __resetCookies();
  });

  afterEach(() => {
    __resetCookies();
  });

  it('returns null when no access cookie is set', async () => {
    expect(await getCurrentSession()).toBeNull();
  });

  it('decodes the JWT payload and surfaces id / email / displayName', async () => {
    const exp = Math.floor(Date.now() / 1000) + 60;
    const token = fakeJwt({ sub: 'user-7', email: 'aisha@example.com', name: 'Aisha', exp });
    const store = await cookies();
    store.set(ACCESS_COOKIE, token);

    expect(await getCurrentSession()).toEqual({
      id: 'user-7',
      email: 'aisha@example.com',
      displayName: 'Aisha'
    });
  });

  it('treats expired tokens as no session', async () => {
    const token = fakeJwt({ sub: 'user-7', exp: Math.floor(Date.now() / 1000) - 60 });
    const store = await cookies();
    store.set(ACCESS_COOKIE, token);

    expect(await getCurrentSession()).toBeNull();
  });

  it('returns null when the cookie is malformed', async () => {
    const store = await cookies();
    store.set(ACCESS_COOKIE, 'not-a-jwt');

    expect(await getCurrentSession()).toBeNull();
  });

  it('initialFor prefers displayName, then email, with sensible fallback', () => {
    expect(initialFor({ id: '1', email: 'b@c.co', displayName: 'Aisha' })).toBe('A');
    expect(initialFor({ id: '1', email: 'b@c.co', displayName: null })).toBe('B');
    expect(initialFor({ id: '1', email: '', displayName: null })).toBe('·');
  });
});
