-- Phase 3.1 BFF persistence (ADR 0011).
--
-- Three tables that move per-user practice state out of the browser's
-- localStorage and into Postgres so it follows the user across devices:
--
--   - last_practiced   : single most-recent surah/ayah per user (Continue
--                        card hydration). PK on user_id; PUT upserts.
--   - best_scores      : best score per (user, surah, ayah). PK is the
--                        composite so PUT /me/best-scores/:key upserts.
--   - practice_attempts: append-only log of completed / failed scoring
--                        runs. Row shape mirrors the Web Attempt type so
--                        the History view can read directly without
--                        joining `surahs` for `surah_name_en`. This is
--                        intentionally separate from the existing
--                        `attempts` table, which belongs to the backend
--                        ASR pipeline (transcript / evaluation JSONB /
--                        partitioned by created_at) and serves a
--                        different lifecycle.
--
-- All three CASCADE on user delete so a future "delete my account" flow
-- removes practice state in one shot.

CREATE TABLE IF NOT EXISTS last_practiced (
    user_id        UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    surah_id       TEXT        NOT NULL,
    ayah_number    SMALLINT    NOT NULL,
    surah_name_en  TEXT        NOT NULL,
    surah_name_ar  TEXT        NOT NULL,
    ayah_count     SMALLINT    NOT NULL,
    practiced_at   TIMESTAMPTZ NOT NULL,
    updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS best_scores (
    user_id      UUID         NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    surah_id     TEXT         NOT NULL,
    ayah_number  SMALLINT     NOT NULL,
    score        SMALLINT     NOT NULL CHECK (score BETWEEN 0 AND 100),
    achieved_at  TIMESTAMPTZ  NOT NULL,
    PRIMARY KEY (user_id, surah_id, ayah_number)
);

CREATE TABLE IF NOT EXISTS practice_attempts (
    id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id       UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    surah_id      TEXT        NOT NULL,
    surah_name_en TEXT        NOT NULL,
    ayah_number   SMALLINT    NOT NULL,
    score         SMALLINT    CHECK (score IS NULL OR (score BETWEEN 0 AND 100)),
    job_id        TEXT        NOT NULL,
    status        TEXT        NOT NULL CHECK (status IN ('COMPLETED', 'FAILED')),
    duration_ms   INTEGER,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_practice_attempts_user_created_at
    ON practice_attempts (user_id, created_at DESC);
