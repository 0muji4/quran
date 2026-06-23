import { getDatabasePool } from '../infra/storage';
import { type UserLevel, type UserRow } from './users';

// Federated-identity persistence. Keyed on `(provider, subject)` — the
// provider's stable `sub` — never email, which can change provider-side.

const USER_COLUMNS = `id, email, display_name, password_hash, created_at, level, deleted_at`;

const mapUserRow = (row: Record<string, unknown>): UserRow => ({
  id: row.id as string,
  email: row.email as string,
  displayName: (row.display_name as string | null) ?? null,
  passwordHash: (row.password_hash as string | null) ?? null,
  createdAt: row.created_at instanceof Date ? row.created_at : new Date(row.created_at as string),
  level: (row.level as UserLevel | null) ?? null,
  deletedAt:
    row.deleted_at == null
      ? null
      : row.deleted_at instanceof Date
        ? row.deleted_at
        : new Date(row.deleted_at as string)
});

export type OAuthProvider = 'google';

// `includeDeleted` lets the sign-in path reactivate a soft-deleted
// account (ADR-0024), matching findUserByEmail.
export const findUserByOAuthIdentity = async (
  provider: OAuthProvider,
  subject: string,
  options?: { includeDeleted?: boolean }
): Promise<UserRow | null> => {
  const pool = getDatabasePool();
  if (!pool) return null;
  const deletedClause = options?.includeDeleted ? '' : ' AND u.deleted_at IS NULL';
  const result = await pool.query(
    `SELECT ${USER_COLUMNS.split(', ')
      .map((c) => `u.${c}`)
      .join(', ')}
     FROM oauth_identities oi
     JOIN users u ON u.id = oi.user_id
     WHERE oi.provider = $1 AND oi.subject = $2${deletedClause}`,
    [provider, subject]
  );
  if (!result.rowCount) return null;
  return mapUserRow(result.rows[0]);
};

// May throw 23505 on the (provider, subject) unique index when a
// concurrent request linked the same identity; the caller re-reads.
export const linkOAuthIdentity = async (input: {
  userId: string;
  provider: OAuthProvider;
  subject: string;
  email: string | null;
}): Promise<void> => {
  const pool = getDatabasePool();
  if (!pool) throw new Error('database not configured');
  await pool.query(
    `INSERT INTO oauth_identities (user_id, provider, subject, email)
     VALUES ($1, $2, $3, $4)`,
    [input.userId, input.provider, input.subject, input.email]
  );
};

// User and identity are inserted in one transaction so a failure never
// leaves a user without its link. password_hash stays NULL (Google-only).
export const createUserFromOAuth = async (input: {
  email: string;
  displayName: string | null;
  provider: OAuthProvider;
  subject: string;
}): Promise<UserRow> => {
  const pool = getDatabasePool();
  if (!pool) throw new Error('database not configured');
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const userResult = await client.query(
      `INSERT INTO users (email, display_name, password_hash, level)
       VALUES ($1, $2, NULL, NULL)
       RETURNING ${USER_COLUMNS}`,
      [input.email, input.displayName]
    );
    const user = mapUserRow(userResult.rows[0]);
    await client.query(
      `INSERT INTO oauth_identities (user_id, provider, subject, email)
       VALUES ($1, $2, $3, $4)`,
      [user.id, input.provider, input.subject, input.email]
    );
    await client.query('COMMIT');
    return user;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};
