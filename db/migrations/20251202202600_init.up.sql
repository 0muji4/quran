-- Initialize Quran project schema with core study objects.
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";
CREATE EXTENSION IF NOT EXISTS "btree_gin";
CREATE EXTENSION IF NOT EXISTS citext;

-- Reference data: Surahs and Ayahs.
CREATE TABLE IF NOT EXISTS surahs (
    id              SMALLINT PRIMARY KEY,
    name_ar         TEXT        NOT NULL,
    name_en         TEXT        NOT NULL,
    revelation_place TEXT       NOT NULL,
    ayah_count      INTEGER     NOT NULL,
    metadata        JSONB       DEFAULT '{}'::jsonb,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS ayahs (
    id              BIGSERIAL PRIMARY KEY,
    surah_id        SMALLINT     NOT NULL REFERENCES surahs(id) ON DELETE CASCADE,
    ayah_number     INTEGER      NOT NULL,
    text_ar         TEXT         NOT NULL,
    text_en         TEXT,
    transliteration TEXT,
    reference_audio_key TEXT,
    metadata        JSONB        DEFAULT '{}'::jsonb,
    created_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    UNIQUE (surah_id, ayah_number)
);

-- Application accounts.
CREATE TABLE IF NOT EXISTS users (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email       CITEXT UNIQUE,
    display_name TEXT,
    preferences JSONB        DEFAULT '{}'::jsonb,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Attempts table for scoring storage.
-- Partitioning was originally intended (PARTITION BY RANGE (created_at)) but
-- never worked: PRIMARY KEY (id) does not include the partition column, which
-- Postgres rejects. The old psql-based migrator silently continued past the
-- error, so no environment ever had this table. Partitioning is deferred to a
-- future ADR (track when individual tables approach ~10 GB).
CREATE TABLE IF NOT EXISTS attempts (
    id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id      UUID         NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    surah_id     SMALLINT     NOT NULL REFERENCES surahs(id),
    ayah_id      BIGINT       REFERENCES ayahs(id),
    transcript   TEXT,
    evaluation   JSONB        DEFAULT '{}'::jsonb,
    created_at   TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    CONSTRAINT attempts_per_user_surah UNIQUE (user_id, surah_id, ayah_id, created_at)
);

-- Segment scores reference attempts and can carry flexible metrics.
CREATE TABLE IF NOT EXISTS segment_scores (
    id           BIGSERIAL PRIMARY KEY,
    attempt_id   UUID         NOT NULL REFERENCES attempts(id) ON DELETE CASCADE,
    segment_label TEXT        NOT NULL,
    score        NUMERIC(6,3) NOT NULL,
    metrics      JSONB        DEFAULT '{}'::jsonb,
    metadata     JSONB        DEFAULT '{}'::jsonb,
    created_at   TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- Alignment information between hypothesis and reference tokens.
CREATE TABLE IF NOT EXISTS alignments (
    id            BIGSERIAL PRIMARY KEY,
    attempt_id    UUID        NOT NULL REFERENCES attempts(id) ON DELETE CASCADE,
    hypothesis    JSONB       NOT NULL,
    reference     JSONB       NOT NULL,
    distance      NUMERIC(8,4),
    metadata      JSONB       DEFAULT '{}'::jsonb,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Text search helpers.
CREATE INDEX IF NOT EXISTS idx_surahs_name_en_trgm ON surahs USING GIN (name_en gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_ayahs_text_ar_trgm ON ayahs USING GIN (text_ar gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_attempts_user_created_at ON attempts (user_id, created_at);
CREATE INDEX IF NOT EXISTS idx_segment_scores_attempt ON segment_scores (attempt_id);
CREATE INDEX IF NOT EXISTS idx_alignments_attempt ON alignments (attempt_id);

-- Metadata lookup acceleration.
CREATE INDEX IF NOT EXISTS idx_ayahs_metadata_gin ON ayahs USING GIN (metadata);
CREATE INDEX IF NOT EXISTS idx_attempts_evaluation_gin ON attempts USING GIN (evaluation);
