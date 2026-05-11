-- Store ASR/alignment outputs keyed by client session.
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

CREATE INDEX IF NOT EXISTS idx_asr_results_ayah_id ON asr_results (ayah_id);
CREATE INDEX IF NOT EXISTS idx_asr_results_word_alignments ON asr_results USING GIN (word_alignments);
