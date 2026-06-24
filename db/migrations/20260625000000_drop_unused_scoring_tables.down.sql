-- Recreate the dropped tables for local-dev rollback (production never runs
-- down per ADR 0012). DDL mirrors the originals from
-- 20251202202600_init and 20251202202700_asr_results. Parents before children.

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

CREATE TABLE IF NOT EXISTS segment_scores (
    id           BIGSERIAL PRIMARY KEY,
    attempt_id   UUID         NOT NULL REFERENCES attempts(id) ON DELETE CASCADE,
    segment_label TEXT        NOT NULL,
    score        NUMERIC(6,3) NOT NULL,
    metrics      JSONB        DEFAULT '{}'::jsonb,
    metadata     JSONB        DEFAULT '{}'::jsonb,
    created_at   TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS alignments (
    id            BIGSERIAL PRIMARY KEY,
    attempt_id    UUID        NOT NULL REFERENCES attempts(id) ON DELETE CASCADE,
    hypothesis    JSONB       NOT NULL,
    reference     JSONB       NOT NULL,
    distance      NUMERIC(8,4),
    metadata      JSONB       DEFAULT '{}'::jsonb,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS asr_results (
    session_id           TEXT PRIMARY KEY,
    ayah_id              BIGINT       NOT NULL REFERENCES ayahs(id) ON DELETE CASCADE,
    audio_key            TEXT         NOT NULL,
    expected_text_ar     TEXT,
    transcript           TEXT         NOT NULL,
    word_timestamps      JSONB        NOT NULL,
    word_alignments      JSONB        NOT NULL DEFAULT '[]'::jsonb,
    wer                  NUMERIC(8,4),
    alignment_object_key TEXT,
    created_at           TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at           TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_attempts_user_created_at ON attempts (user_id, created_at);
CREATE INDEX IF NOT EXISTS idx_segment_scores_attempt ON segment_scores (attempt_id);
CREATE INDEX IF NOT EXISTS idx_alignments_attempt ON alignments (attempt_id);
CREATE INDEX IF NOT EXISTS idx_asr_results_ayah_id ON asr_results (ayah_id);
CREATE INDEX IF NOT EXISTS idx_asr_results_word_alignments ON asr_results USING GIN (word_alignments);
