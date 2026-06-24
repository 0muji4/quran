-- Drop tables in reverse dependency order. Indexes go with their tables.
DROP TABLE IF EXISTS users;
DROP TABLE IF EXISTS ayahs;
DROP TABLE IF EXISTS surahs;

-- Extensions are intentionally left in place: they may be used by other
-- databases on the same Postgres instance, and dropping them risks cascading
-- data loss outside this schema.
