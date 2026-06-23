-- Federated identity links for OAuth/OIDC sign-in. Keyed on the
-- provider's stable `sub`, not email (email can change provider-side).
-- users.password_hash is already nullable, so Google-only users need no
-- further schema change.

CREATE TABLE IF NOT EXISTS oauth_identities (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id     UUID         NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    provider    TEXT         NOT NULL,
    subject     TEXT         NOT NULL,
    email       CITEXT,                  -- audit only, not a lookup key
    created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    -- One identity per provider account; also lets the BFF resolve a
    -- concurrent double-link via the 23505.
    UNIQUE (provider, subject)
);

CREATE INDEX IF NOT EXISTS idx_oauth_identities_user_id
    ON oauth_identities (user_id);
