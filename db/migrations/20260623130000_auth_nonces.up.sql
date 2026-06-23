-- Server-issued single-use nonces for native Google sign-in (DD: Google
-- サインイン（ネイティブ）Q3). The BFF issues a nonce, the native SDK
-- embeds it in the ID token, and the BFF consumes it on verify — defeating
-- ID-token replay. Only the SHA-256 hash is stored (same as refresh_tokens),
-- so a DB leak does not reveal usable nonces.

CREATE TABLE IF NOT EXISTS auth_nonces (
    nonce_hash  TEXT         PRIMARY KEY,
    expires_at  TIMESTAMPTZ  NOT NULL
);
