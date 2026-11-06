import { afterEach, describe, expect, it, vi } from 'vitest';
import { backendAuthorization } from '../backendAuth';
import { fetchWithTracing } from '../backendClient';

describe('backend authorization', () => {
  afterEach(() => {
    delete process.env.BACKEND_AUTH_TOKEN;
    vi.unstubAllGlobals();
  });

  it('is undefined when no token is configured', () => {
    expect(backendAuthorization()).toBeUndefined();
  });

  it('sends the token on REST calls', async () => {
    process.env.BACKEND_AUTH_TOKEN = 'secret';
    const fetchMock = vi.fn().mockResolvedValue(new Response('{}'));
    vi.stubGlobal('fetch', fetchMock);

    await fetchWithTracing('http://backend/api/surahs');

    expect(fetchMock.mock.calls[0][1].headers.authorization).toBe('Bearer secret');
  });
});
