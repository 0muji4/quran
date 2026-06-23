import { createHash, randomBytes } from 'crypto';
import { getDatabasePool } from '../infra/storage';

// Server-issued single-use nonces for the native ID-token path (DD Q3).
// Only the hash is stored, mirroring refresh-tokens.

const NONCE_TTL_MS = 5 * 60 * 1000;

const hashNonce = (nonce: string): string => createHash('sha256').update(nonce).digest('hex');

// Expired rows are swept on each issue so the table self-bounds without a
// purge job. Returns null when the DB is unavailable.
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

// Single-use: the DELETE matches only an unexpired nonce and removes it, so
// a replay finds nothing. True when one was consumed.
export const consumeNonce = async (nonce: string): Promise<boolean> => {
  const pool = getDatabasePool();
  if (!pool) return false;
  const result = await pool.query(
    'DELETE FROM auth_nonces WHERE nonce_hash = $1 AND expires_at > NOW()',
    [hashNonce(nonce)]
  );
  return (result.rowCount ?? 0) > 0;
};
