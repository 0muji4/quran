import { getDatabasePool } from '../infra/storage';

// Subset of `PracticeLevel` that the auth layer is willing to persist.
// Kept narrow so the BFF rejects garbage values at the API boundary
// rather than at the DB CHECK constraint.
export const VALID_LEVELS = ['beginner', 'intermediate', 'advanced'] as const;
export type UserLevel = (typeof VALID_LEVELS)[number];

export type UserRow = {
  id: string;
  email: string;
  displayName: string | null;
  passwordHash: string | null;
  createdAt: Date;
  // Skill level chosen on sign-up. `null` for accounts created before
  // the column existed and for clients (currently iOS) that don't send
  // the field on sign-up. Clients render the badge conditionally so
  // null does not produce an empty pill.
  level: UserLevel | null;
};

const USER_COLUMNS = `id, email, display_name, password_hash, created_at, level`;

const mapRow = (row: Record<string, unknown>): UserRow => ({
  id: row.id as string,
  email: row.email as string,
  displayName: (row.display_name as string | null) ?? null,
  passwordHash: (row.password_hash as string | null) ?? null,
  createdAt: row.created_at instanceof Date ? row.created_at : new Date(row.created_at as string),
  level: isUserLevel(row.level) ? row.level : null
});

const isUserLevel = (value: unknown): value is UserLevel =>
  typeof value === 'string' && (VALID_LEVELS as readonly string[]).includes(value);

// ADR-0024 read gating. `deleted_at IS NOT NULL` is treated as
// "user not found" by every authenticated path so a soft-deleted
// account behaves identically to a never-existed one until the
// purge job removes the row. The sign-in path passes
// `{ includeDeleted: true }` to find the row anyway and reactivate
// it on a correct password (PR-E5).
type LookupOptions = { includeDeleted?: boolean };

const deletedAtClause = (opts: LookupOptions | undefined): string =>
  opts?.includeDeleted ? '' : ' AND deleted_at IS NULL';

export const findUserByEmail = async (
  email: string,
  options?: LookupOptions
): Promise<UserRow | null> => {
  const pool = getDatabasePool();
  if (!pool) return null;
  const result = await pool.query(
    `SELECT ${USER_COLUMNS} FROM users WHERE email = $1${deletedAtClause(options)}`,
    [email]
  );
  if (!result.rowCount) return null;
  return mapRow(result.rows[0]);
};

export const findUserById = async (
  id: string,
  options?: LookupOptions
): Promise<UserRow | null> => {
  const pool = getDatabasePool();
  if (!pool) return null;
  const result = await pool.query(
    `SELECT ${USER_COLUMNS} FROM users WHERE id = $1${deletedAtClause(options)}`,
    [id]
  );
  if (!result.rowCount) return null;
  return mapRow(result.rows[0]);
};

// Partial-update helper. `undefined` keeps the column as-is so the
// caller can update one field without clobbering the other. `null` is
// distinct from `undefined`: `displayName: null` clears the column
// (rare — the web form forbids it today — but accepted for symmetry
// with the create path) and `level: null` clears the skill bucket.
export const updateUserProfile = async (
  id: string,
  updates: { displayName?: string | null; level?: UserLevel | null }
): Promise<UserRow | null> => {
  const pool = getDatabasePool();
  if (!pool) return null;
  // Build SET clause dynamically so we don't overwrite a column that
  // wasn't sent. COALESCE is wrong here: it would treat an explicit
  // null as "no update".
  const sets: string[] = ['updated_at = NOW()'];
  const values: unknown[] = [];
  if (Object.prototype.hasOwnProperty.call(updates, 'displayName')) {
    values.push(updates.displayName ?? null);
    sets.push(`display_name = $${values.length}`);
  }
  if (Object.prototype.hasOwnProperty.call(updates, 'level')) {
    values.push(updates.level ?? null);
    sets.push(`level = $${values.length}`);
  }
  // Nothing to update? Treat as a read so the caller still gets a
  // current snapshot to refresh its UI with.
  if (values.length === 0) {
    return findUserById(id);
  }
  values.push(id);
  // `deleted_at IS NULL` is defense-in-depth: the read gating in
  // findUserById already returns 404 for soft-deleted accounts, but
  // adding the filter here means an UPDATE racing with a soft delete
  // can't resurrect column values onto a deleted row.
  const result = await pool.query(
    `UPDATE users SET ${sets.join(', ')} WHERE id = $${values.length} AND deleted_at IS NULL RETURNING ${USER_COLUMNS}`,
    values
  );
  if (!result.rowCount) return null;
  return mapRow(result.rows[0]);
};

// Targeted password rotation. Kept separate from `updateUserProfile`
// because the caller will always have done a `verifyPassword` round
// trip before reaching here, and bundling password into the generic
// partial update would invite the same caller to skip the verify.
export const updateUserPassword = async (id: string, passwordHash: string): Promise<boolean> => {
  const pool = getDatabasePool();
  if (!pool) return false;
  // Soft-deleted accounts cannot have their password rotated; the
  // sign-in flow reactivates them with the existing hash. The
  // `deleted_at IS NULL` filter is the safety net in case the
  // upstream read gating is bypassed.
  const result = await pool.query(
    `UPDATE users SET password_hash = $1, updated_at = NOW() WHERE id = $2 AND deleted_at IS NULL`,
    [passwordHash, id]
  );
  return (result.rowCount ?? 0) > 0;
};

// Flip a live row into the soft-deleted state per ADR-0024. Returns
// false if the row was already soft-deleted (so the caller can
// short-circuit a redundant token-revocation pass), `true` on the
// first delete. Hard deletion happens via the purge job (PR-E8)
// after the 30-day grace window expires.
export const softDeleteUser = async (id: string): Promise<boolean> => {
  const pool = getDatabasePool();
  if (!pool) return false;
  const result = await pool.query(
    `UPDATE users SET deleted_at = NOW(), updated_at = NOW() WHERE id = $1 AND deleted_at IS NULL`,
    [id]
  );
  return (result.rowCount ?? 0) > 0;
};

export const createUserWithPassword = async (input: {
  email: string;
  displayName: string | null;
  passwordHash: string;
  level: UserLevel | null;
}): Promise<UserRow> => {
  const pool = getDatabasePool();
  if (!pool) throw new Error('database not configured');
  const result = await pool.query(
    `
    INSERT INTO users (email, display_name, password_hash, level)
    VALUES ($1, $2, $3, $4)
    RETURNING ${USER_COLUMNS}
    `,
    [input.email, input.displayName, input.passwordHash, input.level]
  );
  return mapRow(result.rows[0]);
};
