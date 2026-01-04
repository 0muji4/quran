import { beforeEach, describe, expect, it, vi } from 'vitest';
import jwt from 'jsonwebtoken';
import type { Response } from 'express';
import {
  parseCookies,
  decodeJwt,
  authenticateRequest,
  requireAuth,
  authMiddleware,
  buildContext,
  type AuthedRequest
} from '../auth';

const mockEnv = {
  JWT_SECRET: 'test-secret-key-for-testing',
  SESSION_COOKIE_NAME: 'session',
  MOCK_SESSION: 'false',
  NODE_ENV: 'test'
};

describe('parseCookies', () => {
  beforeEach(() => {
    vi.resetModules();
    process.env = { ...mockEnv };
  });

  it('parses standard cookie string', () => {
    const result = parseCookies('sessionId=abc123; userId=user456');

    expect(result).toEqual({
      sessionId: 'abc123',
      userId: 'user456'
    });
  });

  it('returns empty object for empty string', () => {
    const result = parseCookies('');

    expect(result).toEqual({});
  });

  it('returns empty object for undefined', () => {
    const result = parseCookies(undefined);

    expect(result).toEqual({});
  });

  it('decodes URL-encoded values', () => {
    const result = parseCookies('name=John%20Doe; email=test%40example.com');

    expect(result).toEqual({
      name: 'John Doe',
      email: 'test@example.com'
    });
  });

  it('handles cookies with equals signs in values', () => {
    const result = parseCookies('data=key=value=test');

    expect(result).toEqual({
      data: 'key=value=test'
    });
  });

  it('ignores malformed cookie entries', () => {
    const result = parseCookies('validKey=validValue; =noKey; ; empty=');

    expect(result).toEqual({
      validKey: 'validValue'
    });
  });

  it('trims whitespace around cookie entries', () => {
    const result = parseCookies('  key1=value1  ;  key2=value2  ');

    expect(result).toEqual({
      key1: 'value1',
      key2: 'value2'
    });
  });
});

describe('decodeJwt', () => {
  beforeEach(() => {
    vi.resetModules();
    process.env = { ...mockEnv };
  });

  it('decodes valid JWT token', () => {
    const payload = {
      sub: 'user-123',
      email: 'test@example.com',
      name: 'Test User'
    };
    const token = jwt.sign(payload, 'test-secret');

    const result = decodeJwt(token, 'test-secret');

    expect(result).toEqual({
      id: 'user-123',
      email: 'test@example.com',
      displayName: 'Test User'
    });
  });

  it('returns null for invalid token', () => {
    const result = decodeJwt('invalid.token.here', 'test-secret');

    expect(result).toBeNull();
  });

  it('returns null for expired token', () => {
    const payload = { sub: 'user-123', exp: Math.floor(Date.now() / 1000) - 3600 };
    const token = jwt.sign(payload, 'test-secret');

    const result = decodeJwt(token, 'test-secret');

    expect(result).toBeNull();
  });

  it('returns null when no secret provided', () => {
    const token = jwt.sign({ sub: 'user-123' }, 'test-secret');

    const result = decodeJwt(token, undefined);

    expect(result).toBeNull();
  });

  it('uses fallback to id field when sub is missing', () => {
    const payload = {
      id: 'user-456',
      email: 'fallback@example.com'
    };
    const token = jwt.sign(payload, 'test-secret');

    const result = decodeJwt(token, 'test-secret');

    expect(result?.id).toBe('user-456');
  });

  it('uses fallback to displayName field when name is missing', () => {
    const payload = {
      sub: 'user-789',
      displayName: 'Display Name'
    };
    const token = jwt.sign(payload, 'test-secret');

    const result = decodeJwt(token, 'test-secret');

    expect(result?.displayName).toBe('Display Name');
  });

  it('defaults to anonymous when both sub and id are missing', () => {
    const payload = {
      email: 'test@example.com'
    };
    const token = jwt.sign(payload, 'test-secret');

    const result = decodeJwt(token, 'test-secret');

    expect(result?.id).toBe('anonymous');
  });
});

describe('authenticateRequest', () => {
  beforeEach(() => {
    vi.resetModules();
    process.env = { ...mockEnv };
  });

  it('authenticates from Bearer token', () => {
    const payload = {
      sub: 'user-123',
      email: 'bearer@example.com',
      name: 'Bearer User'
    };
    const token = jwt.sign(payload, mockEnv.JWT_SECRET);

    const req = {
      headers: {
        authorization: `Bearer ${token}`
      }
    } as AuthedRequest;

    const result = authenticateRequest(req);

    expect(result).toEqual({
      id: 'user-123',
      email: 'bearer@example.com',
      displayName: 'Bearer User'
    });
  });

  it('authenticates from Cookie token', () => {
    const payload = {
      sub: 'user-456',
      email: 'cookie@example.com',
      name: 'Cookie User'
    };
    const token = jwt.sign(payload, mockEnv.JWT_SECRET);

    const req = {
      headers: {
        cookie: `session=${token}; other=value`
      }
    } as AuthedRequest;

    const result = authenticateRequest(req);

    expect(result).toEqual({
      id: 'user-456',
      email: 'cookie@example.com',
      displayName: 'Cookie User'
    });
  });

  it('prefers Bearer token over Cookie', () => {
    const bearerPayload = { sub: 'bearer-user', email: 'bearer@example.com' };
    const cookiePayload = { sub: 'cookie-user', email: 'cookie@example.com' };

    const bearerToken = jwt.sign(bearerPayload, mockEnv.JWT_SECRET);
    const cookieToken = jwt.sign(cookiePayload, mockEnv.JWT_SECRET);

    const req = {
      headers: {
        authorization: `Bearer ${bearerToken}`,
        cookie: `session=${cookieToken}`
      }
    } as AuthedRequest;

    const result = authenticateRequest(req);

    expect(result?.id).toBe('bearer-user');
  });

  it('returns null when no authentication provided', () => {
    const req = {
      headers: {}
    } as AuthedRequest;

    const result = authenticateRequest(req);

    expect(result).toBeNull();
  });

  it('returns null for invalid Bearer token', () => {
    const req = {
      headers: {
        authorization: 'Bearer invalid.token.here'
      }
    } as AuthedRequest;

    const result = authenticateRequest(req);

    expect(result).toBeNull();
  });

  it('returns mock session when MOCK_SESSION is true in non-production', () => {
    process.env.MOCK_SESSION = 'true';
    process.env.NODE_ENV = 'test';

    const req = {
      headers: {}
    } as AuthedRequest;

    const result = authenticateRequest(req);

    expect(result).toEqual({
      id: 'mock-user',
      email: 'mock-user@example.com',
      displayName: 'Mock User'
    });
  });

  it('does not return mock session when MOCK_SESSION is true in production', () => {
    process.env.MOCK_SESSION = 'true';
    process.env.NODE_ENV = 'production';

    const req = {
      headers: {}
    } as AuthedRequest;

    const result = authenticateRequest(req);

    expect(result).toBeNull();
  });

  it('uses custom cookie name from env', () => {
    process.env.SESSION_COOKIE_NAME = 'customSession';

    const payload = { sub: 'user-789' };
    const token = jwt.sign(payload, mockEnv.JWT_SECRET);

    const req = {
      headers: {
        cookie: `customSession=${token}; other=value`
      }
    } as AuthedRequest;

    const result = authenticateRequest(req);

    expect(result?.id).toBe('user-789');
  });
});

describe('requireAuth', () => {
  beforeEach(() => {
    vi.resetModules();
    process.env = { ...mockEnv };
  });

  it('returns session when authenticated', () => {
    const session = {
      id: 'user-123',
      email: 'test@example.com',
      displayName: 'Test User'
    };

    const req = {
      session
    } as AuthedRequest;

    const res = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn()
    } as unknown as Response;

    const result = requireAuth(req, res);

    expect(result).toEqual(session);
    expect(res.status).not.toHaveBeenCalled();
    expect(res.json).not.toHaveBeenCalled();
  });

  it('returns 401 when not authenticated', () => {
    const req = {
      session: null
    } as AuthedRequest;

    const res = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn()
    } as unknown as Response;

    const result = requireAuth(req, res);

    expect(result).toBeNull();
    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ error: 'authentication required' });
  });

  it('returns 401 when session is undefined', () => {
    const req = {} as AuthedRequest;

    const res = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn()
    } as unknown as Response;

    const result = requireAuth(req, res);

    expect(result).toBeNull();
    expect(res.status).toHaveBeenCalledWith(401);
  });
});

describe('authMiddleware', () => {
  beforeEach(() => {
    vi.resetModules();
    process.env = { ...mockEnv };
  });

  it('sets session on request and calls next', () => {
    const payload = {
      sub: 'user-123',
      email: 'test@example.com'
    };
    const token = jwt.sign(payload, mockEnv.JWT_SECRET);

    const req = {
      headers: {
        authorization: `Bearer ${token}`
      }
    } as AuthedRequest;

    const res = {} as Response;
    const next = vi.fn();

    authMiddleware(req, res, next);

    expect(req.session).toEqual({
      id: 'user-123',
      email: 'test@example.com',
      displayName: undefined
    });
    expect(next).toHaveBeenCalledOnce();
  });

  it('sets session to null when no auth and calls next', () => {
    const req = {
      headers: {}
    } as AuthedRequest;

    const res = {} as Response;
    const next = vi.fn();

    authMiddleware(req, res, next);

    expect(req.session).toBeNull();
    expect(next).toHaveBeenCalledOnce();
  });
});

describe('buildContext', () => {
  beforeEach(() => {
    vi.resetModules();
    process.env = { ...mockEnv };
  });

  it('builds context with session and requestId from header', () => {
    const session = {
      id: 'user-123',
      email: 'test@example.com',
      displayName: 'Test User'
    };

    const req = {
      session,
      headers: {
        'x-request-id': 'request-456'
      }
    } as AuthedRequest;

    const context = buildContext(req);

    expect(context).toEqual({
      session,
      requestId: 'request-456'
    });
  });

  it('generates requestId when not provided in headers', () => {
    const session = {
      id: 'user-123',
      email: 'test@example.com'
    };

    const req = {
      session,
      headers: {}
    } as AuthedRequest;

    const context = buildContext(req);

    expect(context.session).toEqual(session);
    expect(context.requestId).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i);
  });

  it('builds context with null session', () => {
    const req = {
      session: null,
      headers: {}
    } as AuthedRequest;

    const context = buildContext(req);

    expect(context.session).toBeNull();
    expect(context.requestId).toBeDefined();
  });
});
