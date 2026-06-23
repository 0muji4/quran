import { createHash, randomBytes } from 'crypto';
import { getDatabasePool } from '../infra/storage';

// Server-issued single-use nonces for the native ID-token path (DD Q3).
// Only the hash is stored, mirroring refresh-tokens.

const NONCE_TTL_MS = 5 * 60 * 1000;

const hashNonce = (nonce: string): string => createHash('sha256').update(nonce).digest('hex');

// Mint a nonce, persist its hash with a short TTL, and return the raw value
// for the client to hand to the Google SDK. Expired rows are swept on issue
// so the table self-bounds without a separate job. Returns null if the DB is
// unavailable.
export const issueNonce = async (): Promise<string | null> => {
  const pool = getDatabasePool();
  if (!pool) return null;
  const nonce = randomBytes(32).toString('base64url');
  const expiresAt = new Date(Date.now() + NONCE_TTL_MS);
  await pool.query('DELETE FROM auth_nonces WHERE expires_at < NOW()');
  await pool.query('INSERT INTO auth_nonces (nonce_hash, expires_at) VALUES ($1, $2)', [
    hashNonce(nonce),
    expiresAt.toISOString()
  ]);
  return nonce;
};

// Atomically consume a nonce: the single DELETE both checks validity
// (present and unexpired) and removes it, so a replay finds nothing. Returns
// true only if a valid nonce was consumed.
export const consumeNonce = async (nonce: string): Promise<boolean> => {
  const pool = getDatabasePool();
  if (!pool) return false;
  const result = await pool.query(
    'DELETE FROM auth_nonces WHERE nonce_hash = $1 AND expires_at > NOW()',
    [hashNonce(nonce)]
  );
  return (result.rowCount ?? 0) > 0;
};
