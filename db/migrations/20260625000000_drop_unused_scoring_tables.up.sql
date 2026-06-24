-- Drop the scoring-storage tables that were scaffolded but never wired.
-- Scoring now persists its breakdown to scoring_jobs.evaluation (JSON), which
-- superseded both the asr_results session cache (its last reader was removed
-- when getScoringJob switched to evaluation) and the normalized
-- attempts/segment_scores/alignments model (never written by any code). This
-- is the contract step per ADR 0012 expand-contract: asr_results' last reader
-- shipped in a prior release; the others were never in use.
--
-- segment_scores and alignments FK attempts(id), so they drop first.
DROP TABLE IF EXISTS segment_scores;
DROP TABLE IF EXISTS alignments;
DROP TABLE IF EXISTS attempts;
DROP TABLE IF EXISTS asr_results;
