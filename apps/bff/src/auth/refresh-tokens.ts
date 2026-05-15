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

export type RefreshTokenRow = {
  userId: string;
  expiresAt: Date;
  usedAt: Date | null;
  revokedAt: Date | null;
};

export const findRefreshToken = async (tokenHash: string): Promise<RefreshTokenRow | null> => {
  const pool = getDatabasePool();
  if (!pool) return null;
  const result = await pool.query(
    `
    SELECT user_id, expires_at, used_at, revoked_at
    FROM refresh_tokens
    WHERE token_hash = $1
    `,
    [tokenHash]
  );
  if (!result.rowCount) return null;
  const row = result.rows[0];
  return {
    userId: row.user_id,
    expiresAt: new Date(row.expires_at),
    usedAt: row.used_at ? new Date(row.used_at) : null,
    revokedAt: row.revoked_at ? new Date(row.revoked_at) : null
  };
};

export const markRefreshTokenUsed = async (tokenHash: string): Promise<void> => {
  const pool = getDatabasePool();
  if (!pool) return;
  await pool.query(
    `UPDATE refresh_tokens SET used_at = NOW() WHERE token_hash = $1 AND used_at IS NULL`,
    [tokenHash]
  );
};

// Invalidate every outstanding refresh token for a user. Called when we
// detect a token being redeemed twice — the legitimate session and any
// attacker copies are both forced back through /auth/login.
export const revokeAllRefreshTokensForUser = async (userId: string): Promise<void> => {
  const pool = getDatabasePool();
  if (!pool) return;
  await pool.query(
    `UPDATE refresh_tokens SET revoked_at = NOW() WHERE user_id = $1 AND revoked_at IS NULL`,
    [userId]
  );
};
