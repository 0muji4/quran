-- Per-user practice preferences (Issue #476). Separate table, mirroring
-- the other per-user state (last_practiced / best_scores).
CREATE TABLE IF NOT EXISTS user_preferences (
    user_id                 UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    -- Slug, not an FK: there is no reciters table yet. The allowed set is
    -- validated at the BFF, not by a CHECK here, because it changes once a
    -- reciters source of truth lands.
    reference_reciter_id    TEXT         NOT NULL DEFAULT 'husary-muallim',
    default_playback_speed  NUMERIC(3,2) NOT NULL DEFAULT 1.00
                            CHECK (default_playback_speed BETWEEN 0.5 AND 2.0),
    daily_reminder_enabled  BOOLEAN      NOT NULL DEFAULT FALSE,
    -- TIME, not TEXT, so Postgres rejects a malformed clock value.
    daily_reminder_time     TIME         NOT NULL DEFAULT '08:00',
    created_at              TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at              TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);
