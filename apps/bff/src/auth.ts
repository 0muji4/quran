import { randomUUID } from 'crypto';
import type { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import type { GraphQLContext, UserSession } from '@quran-project/shared-ts';

export type AuthedRequest = Request & { session?: UserSession | null };

const buildMockSession = (): UserSession => ({
  id: 'mock-user',
  email: 'mock-user@example.com',
  displayName: 'Mock User'
});

const decodeJwt = (token: string, secret?: string): UserSession | null => {
  if (!secret) return null;

  try {
    const payload = jwt.verify(token, secret) as jwt.JwtPayload;

    return {
      id: (payload.sub as string) ?? (payload.id as string) ?? 'anonymous',
      email: (payload.email as string) ?? undefined,
      displayName: (payload.name as string) ?? (payload.displayName as string) ?? undefined
    };
  } catch (error) {
    return null;
  }
};

export const authenticateRequest = (req: AuthedRequest): UserSession | null => {
  const authHeader = req.headers.authorization;
  const secret = process.env.JWT_SECRET;

  if (authHeader?.startsWith('Bearer ')) {
    const token = authHeader.replace('Bearer ', '').trim();
    const session = decodeJwt(token, secret);

    if (session) return session;
  }

  if (process.env.MOCK_SESSION === 'true') {
    return buildMockSession();
  }

  return null;
};

export const authMiddleware = (req: AuthedRequest, _res: Response, next: NextFunction): void => {
  req.session = authenticateRequest(req);
  next();
};

export const buildContext = (req: AuthedRequest): GraphQLContext => ({
  session: req.session ?? null,
  requestId: (req.headers['x-request-id'] ?? randomUUID()).toString()
});
