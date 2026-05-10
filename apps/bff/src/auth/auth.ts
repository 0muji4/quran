import { randomUUID } from 'crypto';
import type { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import type { GraphQLContext, UserSession } from '@quran-project/shared-ts';

export type AuthedRequest = Request & {
  session?: UserSession | null;
  signal?: AbortSignal;
};

// Fixed UUID for the dev / CI mock user. The matching row is seeded in
// db/seed.sql so writes through the /me endpoints satisfy the FK on
// users.id without needing real auth.
export const MOCK_SESSION_USER_ID = '00000000-0000-0000-0000-000000000001';

const buildMockSession = (): UserSession => ({
  id: MOCK_SESSION_USER_ID,
  email: 'mock-user@example.com',
  displayName: 'Mock User'
});

// Exported for testing
export const decodeJwt = (token: string, secret?: string): UserSession | null => {
  if (!secret) return null;

  try {
    const payload = jwt.verify(token, secret) as jwt.JwtPayload;

    return {
      id: (payload.sub as string) ?? (payload.id as string) ?? 'anonymous',
      email: (payload.email as string) ?? undefined,
      displayName: (payload.name as string) ?? (payload.displayName as string) ?? undefined
    };
  } catch {
    return null;
  }
};

// Exported for testing
export const parseCookies = (header?: string): Record<string, string> => {
  if (!header) return {};
  return header.split(';').reduce<Record<string, string>>((acc, chunk) => {
    const [rawKey, ...rawValue] = chunk.trim().split('=');
    if (!rawKey || rawValue.length === 0) return acc;
    acc[rawKey] = decodeURIComponent(rawValue.join('='));
    return acc;
  }, {});
};

export const authenticateRequest = (req: AuthedRequest): UserSession | null => {
  const authHeader = req.headers.authorization;
  const secret = process.env.JWT_SECRET;
  const cookieName = process.env.SESSION_COOKIE_NAME ?? 'session';

  if (authHeader?.startsWith('Bearer ')) {
    const token = authHeader.replace('Bearer ', '').trim();
    const session = decodeJwt(token, secret);

    if (session) return session;
  }

  const cookies = parseCookies(req.headers.cookie);
  const cookieToken = cookies[cookieName];
  if (cookieToken) {
    const session = decodeJwt(cookieToken, secret);
    if (session) return session;
  }

  if (process.env.MOCK_SESSION === 'true' && process.env.NODE_ENV !== 'production') {
    return buildMockSession();
  }

  return null;
};

export const authMiddleware = (req: AuthedRequest, _res: Response, next: NextFunction): void => {
  req.session = authenticateRequest(req);
  next();
};

export const requireAuth = (req: AuthedRequest, res: Response): UserSession | null => {
  const session = req.session ?? null;
  if (!session) {
    res.status(401).json({ error: 'authentication required' });
    return null;
  }
  return session;
};

export const buildContext = (req: AuthedRequest): GraphQLContext => ({
  session: req.session ?? null,
  requestId: (req.headers['x-request-id'] ?? randomUUID()).toString()
});
