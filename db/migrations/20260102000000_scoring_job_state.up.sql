-- Track scoring job lifecycle state for queued audio evaluations.
CREATE TABLE IF NOT EXISTS scoring_jobs (
    session_id  TEXT PRIMARY KEY,
    user_id     TEXT,
    upload_key  TEXT        NOT NULL,
    surah_id    SMALLINT    NOT NULL REFERENCES surahs(id),
    ayah_id     BIGINT      NOT NULL REFERENCES ayahs(id),
    ayah_number INTEGER     NOT NULL,
    status      TEXT        NOT NULL,
    score       NUMERIC(6,3),
    verdict     TEXT,
    segments    JSONB       DEFAULT '[]'::jsonb,
    evaluation  JSONB,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT scoring_jobs_status_check CHECK (status IN ('QUEUED', 'RUNNING', 'COMPLETED', 'FAILED'))
);

CREATE INDEX IF NOT EXISTS idx_scoring_jobs_status ON scoring_jobs (status);
CREATE INDEX IF NOT EXISTS idx_scoring_jobs_user ON scoring_jobs (user_id);
