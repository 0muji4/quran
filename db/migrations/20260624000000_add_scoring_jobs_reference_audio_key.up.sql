-- Records the teacher-recitation object key the scoring run was measured
-- against, so the result read path (BFF getScoringJob) can presign a playable
-- referenceAudioUrl without re-resolving the reference. Additive and nullable:
-- existing rows and the create path tolerate a null key.
ALTER TABLE scoring_jobs ADD COLUMN reference_audio_key TEXT;
