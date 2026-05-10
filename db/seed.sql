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
