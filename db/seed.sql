-- Demo / fixture data for local development.
--
-- Reference Quran data (surahs and ayahs) is loaded from db/seed_quran.sql,
-- which is applied first by `make db-seed`. This file is reserved for demo
-- fixtures (mock users, sample attempts, etc.) that should NOT be derived
-- from the upstream Quran dataset.
--
-- Add new fixtures below as needed.

-- Mock user matching apps/bff MOCK_SESSION_USER_ID. Lets MOCK_SESSION=true
-- writes satisfy the FK on users.id without a real auth flow. Idempotent.
INSERT INTO users (id, email, display_name)
VALUES (
  '00000000-0000-0000-0000-000000000001',
  'mock-user@example.com',
  'Mock User'
)
ON CONFLICT (id) DO NOTHING;

-- Practice preferences for the mock user so the card renders under
-- MOCK_SESSION in dev / e2e (Issue #476). Idempotent.
INSERT INTO user_preferences (user_id)
VALUES ('00000000-0000-0000-0000-000000000001')
ON CONFLICT (user_id) DO NOTHING;

-- Deterministic Result-page fixture for visual regression (Phase 3.4 /
-- ADR 0004). A COMPLETED scoring_jobs row whose `evaluation` blob is the
-- source of truth the BFF maps into PronunciationFeedback, so
-- /practice/1/1/result/visual-baseline-fatihah-1 renders a fully-populated
-- ResultDetail (metrics + word-by-word) on every CI run. Surah 1 ayah 1
-- is reused because its reference audio is the most likely to exist in
-- the CI MinIO seed; the BFF degrades gracefully if it does not.
INSERT INTO scoring_jobs (
  session_id, user_id, upload_key, surah_id, ayah_id, ayah_number,
  status, score, verdict, segments, evaluation, created_at, updated_at
) VALUES (
  'visual-baseline-fatihah-1',
  '00000000-0000-0000-0000-000000000001',
  'visual-baseline/fatihah-1-recording.webm',
  1,
  (SELECT id FROM ayahs WHERE surah_id = 1 AND ayah_number = 1),
  1,
  'COMPLETED',
  0.86,
  'A confident recitation with clear vowel lengths.',
  '[]'::jsonb,
  '{"accuracy":0.86,"fluency":0.82,"completeness":0.9,"wer":0.14,"transcript":"بسم الله الرحمن الرحيم","alignments":[{"ref_word":"بِسْمِ","hyp_word":"بِسْمِ","op":"match"},{"ref_word":"اللَّهِ","hyp_word":"اللَّهِ","op":"match"},{"ref_word":"الرَّحْمَٰنِ","hyp_word":"الرَّحْمَٰنِ","op":"match"},{"ref_word":"الرَّحِيمِ","hyp_word":"الرَّحِيمِ","op":"match"}]}'::jsonb,
  '2026-05-08T10:00:00.000Z'::timestamptz,
  '2026-05-08T10:00:00.000Z'::timestamptz
)
ON CONFLICT (session_id) DO NOTHING;
