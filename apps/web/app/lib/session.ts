import 'server-only';
import { readAccessToken } from './auth-cookies';

export type Session = {
  id: string;
  email: string;
  displayName: string | null;
};

const decodePayload = (token: string): Record<string, unknown> | null => {
  try {
    const parts = token.split('.');
    if (parts.length < 2) return null;
    const normalized = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const padded = normalized.padEnd(normalized.length + ((4 - (normalized.length % 4)) % 4), '=');
    const json = Buffer.from(padded, 'base64').toString('utf8');
    const parsed = JSON.parse(json) as unknown;
    return typeof parsed === 'object' && parsed !== null
      ? (parsed as Record<string, unknown>)
      : null;
  } catch {
    return null;
  }
};

// HttpOnly cookies cannot be forged by client JS, so decoding without
// verifying the signature is safe for *display* purposes. Every BFF call
// re-verifies the same token, so any tampering would be rejected there.
export const getCurrentSession = async (): Promise<Session | null> => {
  const token = await readAccessToken();
  if (!token) return null;

  const payload = decodePayload(token);
  if (!payload || typeof payload.sub !== 'string' || payload.sub.length === 0) return null;

  if (typeof payload.exp === 'number' && payload.exp * 1000 < Date.now()) return null;

  const email = typeof payload.email === 'string' ? payload.email : '';
  const displayName =
    typeof payload.name === 'string' && payload.name.length > 0 ? payload.name : null;

  return { id: payload.sub, email, displayName };
};

export const initialFor = (session: Session): string => {
  if (session.displayName && session.displayName.length > 0) {
    return session.displayName.charAt(0).toUpperCase();
  }
  if (session.email && session.email.length > 0) {
    return session.email.charAt(0).toUpperCase();
  }
  return '·';
};
