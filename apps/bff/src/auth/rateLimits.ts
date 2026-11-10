import type { Request } from 'express';
import { ipKeyGenerator, rateLimit, type Options } from 'express-rate-limit';
import type { AuthedRequest } from './auth';

const MINUTE_MS = 60 * 1000;

/** Limits apply only in production, so local stacks, tests, and e2e are not throttled. */
const isDisabled = (): boolean => process.env.NODE_ENV !== 'production';

/**
 * The client address that IP limits are keyed on.
 *
 * On Render, requests pass through Cloudflare and Render's own proxies, and
 * X-Forwarded-For keeps whatever the client sent at its front. Cloudflare sets
 * True-Client-IP to the connecting address and overwrites a value the client
 * sends, so on Render (which sets RENDER=true) that header is the client.
 * Elsewhere the BFF trusts no proxy and uses the socket address.
 */
export const clientAddress = (req: Request): string => {
  if (process.env.RENDER === 'true') {
    const trueClientIp = req.get('true-client-ip');
    if (trueClientIp) return trueClientIp;
  }
  return req.ip ?? '';
};

const ipKey = (req: Request): string => `ip:${ipKeyGenerator(clientAddress(req))}`;

const limiter = (windowMs: number, limit: number, keyGenerator: Options['keyGenerator'] = ipKey) =>
  rateLimit({
    windowMs,
    limit,
    keyGenerator,
    skip: isDisabled,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    message: { error: 'too many requests' },
    // Keys come from clientAddress, not from X-Forwarded-For, so the header
    // arriving while Express trusts no proxy is expected.
    validate: { xForwardedForHeader: false }
  });

const emailKey = (req: Request): string => {
  const email = (req.body as { email?: unknown } | undefined)?.email;
  return typeof email === 'string' ? `email:${email.trim().toLowerCase()}` : ipKey(req);
};

const userKey = (req: Request): string => {
  const userId = (req as AuthedRequest).session?.id;
  return userId ? `user:${userId}` : ipKey(req);
};

/** Account creation per client IP. */
export const signupLimiter = limiter(60 * MINUTE_MS, 5);

/** Sign-in attempts per client IP. */
export const loginIpLimiter = limiter(15 * MINUTE_MS, 20);

/** Sign-in attempts per account, so one password cannot be guessed from many IPs. */
export const loginAccountLimiter = limiter(15 * MINUTE_MS, 10, emailKey);

/** Google sign-in calls per client IP. */
export const googleLimiter = limiter(15 * MINUTE_MS, 30);

/** Email and password changes per signed-in user. */
export const credentialChangeLimiter = limiter(15 * MINUTE_MS, 10, userKey);
