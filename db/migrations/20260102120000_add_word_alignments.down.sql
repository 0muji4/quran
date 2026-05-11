DROP INDEX IF EXISTS idx_asr_results_word_alignments;
ALTER TABLE asr_results DROP COLUMN IF EXISTS word_alignments;
