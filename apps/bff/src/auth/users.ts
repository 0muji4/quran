import { getDatabasePool } from '../infra/storage';

export type UserRow = {
  id: string;
  email: string;
  displayName: string | null;
  passwordHash: string | null;
};

export const findUserByEmail = async (email: string): Promise<UserRow | null> => {
  const pool = getDatabasePool();
  if (!pool) return null;
  const result = await pool.query(
    `SELECT id, email, display_name, password_hash FROM users WHERE email = $1`,
    [email]
  );
  if (!result.rowCount) return null;
  const row = result.rows[0];
  return {
    id: row.id,
    email: row.email,
    displayName: row.display_name,
    passwordHash: row.password_hash
  };
};

export const findUserById = async (id: string): Promise<UserRow | null> => {
  const pool = getDatabasePool();
  if (!pool) return null;
  const result = await pool.query(
    `SELECT id, email, display_name, password_hash FROM users WHERE id = $1`,
    [id]
  );
  if (!result.rowCount) return null;
  const row = result.rows[0];
  return {
    id: row.id,
    email: row.email,
    displayName: row.display_name,
    passwordHash: row.password_hash
  };
};

export const createUserWithPassword = async (input: {
  email: string;
  displayName: string | null;
  passwordHash: string;
}): Promise<UserRow> => {
  const pool = getDatabasePool();
  if (!pool) throw new Error('database not configured');
  const result = await pool.query(
    `
    INSERT INTO users (email, display_name, password_hash)
    VALUES ($1, $2, $3)
    RETURNING id, email, display_name, password_hash
    `,
    [input.email, input.displayName, input.passwordHash]
  );
  const row = result.rows[0];
  return {
    id: row.id,
    email: row.email,
    displayName: row.display_name,
    passwordHash: row.password_hash
  };
};
