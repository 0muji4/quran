import { createHash } from 'crypto';
import { getDatabasePool } from '../infra/storage';

// SHA-256 of the JWT string. We never persist the raw refresh token —
// only its hash — so a DB leak does not yield usable session tokens.
// Verification still goes through `jwt.verify` first (defense in depth):
// the DB row only proves the token was issued and not yet redeemed.
export const hashRefreshToken = (token: string): string =>
  createHash('sha256').update(token).digest('hex');

export const recordIssuedRefreshToken = async (input: {
  userId: string;
  tokenHash: string;
  expiresAt: Date;
}): Promise<void> => {
  const pool = getDatabasePool();
  if (!pool) return;
  await pool.query(
    `
    INSERT INTO refresh_tokens (token_hash, user_id, expires_at)
    VALUES ($1, $2, $3)
    `,
    [input.tokenHash, input.userId, input.expiresAt.toISOString()]
  );
};
