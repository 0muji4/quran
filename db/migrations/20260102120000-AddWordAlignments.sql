-- Add word_alignments column to asr_results table
-- This column stores word-level alignment data for pronunciation feedback

ALTER TABLE asr_results
ADD COLUMN IF NOT EXISTS word_alignments JSONB NOT NULL DEFAULT '[]'::jsonb;

-- Create GIN index for efficient querying of word_alignments
CREATE INDEX IF NOT EXISTS idx_asr_results_word_alignments
ON asr_results USING GIN (word_alignments);
