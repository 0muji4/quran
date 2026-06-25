-- NULL for OAuth-only accounts; existing password rows backfilled to created_at.
ALTER TABLE users ADD COLUMN password_changed_at TIMESTAMPTZ;

UPDATE users
SET password_changed_at = created_at
WHERE password_hash IS NOT NULL
  AND password_changed_at IS NULL;
