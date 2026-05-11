-- Application accounts: password column for the bcrypt-backed login flow.
-- Existing rows (e.g. the seeded mock user) intentionally start with NULL so
-- they remain accessible to mock-session callers but cannot be signed in to
-- via /auth/login until a hash is set.

ALTER TABLE users
    ADD COLUMN IF NOT EXISTS password_hash TEXT;
