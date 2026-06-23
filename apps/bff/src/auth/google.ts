import { OAuth2Client } from 'google-auth-library';

export interface GoogleIdentity {
  subject: string;
  email: string;
  // Load-bearing for the account-link decision (DD Q4): an unverified
  // Google email must not auto-link to an existing account.
  emailVerified: boolean;
  name: string | null;
  // Present on the native ID-token path (the SDK embeds the nonce we
  // issued); the caller consumes it for replay protection (DD Q3). Absent
  // on the web code-exchange path.
  nonce: string | null;
}

const getClientId = (): string | null => process.env.GOOGLE_OAUTH_CLIENT_ID ?? null;
const getClientSecret = (): string | null => process.env.GOOGLE_OAUTH_CLIENT_SECRET ?? null;

// Redirect URI Google expects for the popup auth-code flow
// (google.accounts.oauth2.initCodeClient with ux_mode: 'popup').
const REDIRECT_URI = 'postmessage';

const toIdentity = (
  payload:
    | { sub?: string; email?: string; email_verified?: boolean; name?: string; nonce?: string }
    | undefined
): GoogleIdentity | null => {
  if (!payload?.sub || !payload.email) return null;
  return {
    subject: payload.sub,
    email: payload.email,
    emailVerified: payload.email_verified === true,
    name: payload.name ?? null,
    nonce: payload.nonce ?? null
  };
};

// Verifies a native-obtained ID token directly (no code exchange) and
// returns the identity, including the `nonce` claim for replay checking.
// Returns null on any verification failure. Throws only when Google sign-in
// is not configured (caller → 503).
export const verifyGoogleIdToken = async (idToken: string): Promise<GoogleIdentity | null> => {
  const clientId = getClientId();
  if (!clientId) throw new Error('Google sign-in is not configured');

  const client = new OAuth2Client(clientId);
  try {
    const ticket = await client.verifyIdToken({ idToken, audience: clientId });
    return toIdentity(ticket.getPayload());
  } catch {
    return null;
  }
};

// Exchanges the browser-obtained auth code for tokens, verifies the
// returned ID token, and returns the identity. Returns null on any failure
// (invalid/expired code, missing id_token). Throws only when Google sign-in
// is not configured (caller → 503). The exchange needs the client secret,
// so this is a confidential-client flow run only on the BFF.
export const exchangeGoogleCode = async (code: string): Promise<GoogleIdentity | null> => {
  const clientId = getClientId();
  const clientSecret = getClientSecret();
  if (!clientId || !clientSecret) throw new Error('Google sign-in is not configured');

  const client = new OAuth2Client({ clientId, clientSecret, redirectUri: REDIRECT_URI });
  try {
    const { tokens } = await client.getToken(code);
    if (!tokens.id_token) return null;
    const ticket = await client.verifyIdToken({ idToken: tokens.id_token, audience: clientId });
    return toIdentity(ticket.getPayload());
  } catch {
    return null;
  }
};
