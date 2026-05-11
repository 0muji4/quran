-- Defensive: add word_alignments to asr_results when an earlier deployment
-- created the table before this column was part of the initial schema.
-- For fresh databases the column already exists from migration
-- 20251202202700_asr_results; this migration is then a no-op.

ALTER TABLE asr_results
ADD COLUMN IF NOT EXISTS word_alignments JSONB NOT NULL DEFAULT '[]'::jsonb;

CREATE INDEX IF NOT EXISTS idx_asr_results_word_alignments
ON asr_results USING GIN (word_alignments);
