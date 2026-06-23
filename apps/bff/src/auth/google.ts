import { OAuth2Client } from 'google-auth-library';

export interface GoogleIdentity {
  subject: string;
  email: string;
  // Load-bearing for the account-link decision (DD Q4): an unverified
  // Google email must not auto-link to an existing account.
  emailVerified: boolean;
  name: string | null;
}

// Lazily built so the BFF boots (and runs password auth) without
// GOOGLE_OAUTH_CLIENT_ID; the client is only needed on this path.
let cachedClient: OAuth2Client | null = null;
let cachedClientId: string | null = null;

export const getGoogleClientId = (): string | null => process.env.GOOGLE_OAUTH_CLIENT_ID ?? null;

const getClient = (clientId: string): OAuth2Client => {
  if (!cachedClient || cachedClientId !== clientId) {
    cachedClient = new OAuth2Client(clientId);
    cachedClientId = clientId;
  }
  return cachedClient;
};

// Returns null on any verification failure (forged/expired/wrong-audience
// or missing sub/email) — caller treats null as 401. Throws only when
// Google sign-in is not configured.
export const verifyGoogleIdToken = async (idToken: string): Promise<GoogleIdentity | null> => {
  const clientId = getGoogleClientId();
  if (!clientId) throw new Error('GOOGLE_OAUTH_CLIENT_ID is not configured');

  try {
    const ticket = await getClient(clientId).verifyIdToken({ idToken, audience: clientId });
    const payload = ticket.getPayload();
    if (!payload?.sub || !payload.email) return null;
    return {
      subject: payload.sub,
      email: payload.email,
      emailVerified: payload.email_verified === true,
      name: payload.name ?? null
    };
  } catch {
    return null;
  }
};
