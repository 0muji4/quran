-- Track user-owned object storage keys for retention and deletion flows.
CREATE TABLE IF NOT EXISTS user_data_objects (
    session_id           TEXT PRIMARY KEY,
    user_id              TEXT         NOT NULL,
    audio_key            TEXT         NOT NULL,
    alignment_object_key TEXT,
    attempt_id           UUID,
    expires_at           TIMESTAMPTZ  NOT NULL,
    created_at           TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at           TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_user_data_objects_user ON user_data_objects (user_id);
CREATE INDEX IF NOT EXISTS idx_user_data_objects_expires ON user_data_objects (expires_at);
