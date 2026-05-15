-- Server-side state for issued refresh tokens. Required by the
-- refresh-token rotation flow: /auth/refresh must reject any token
-- that has already been redeemed (reuse = replay attack) and must
-- support revoking every outstanding token for a user in one shot.

CREATE TABLE IF NOT EXISTS refresh_tokens (
    token_hash  TEXT         PRIMARY KEY,
    user_id     UUID         NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    issued_at   TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    expires_at  TIMESTAMPTZ  NOT NULL,
    used_at     TIMESTAMPTZ,
    revoked_at  TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_refresh_tokens_user_id
    ON refresh_tokens (user_id);
