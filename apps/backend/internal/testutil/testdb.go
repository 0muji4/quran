//go:build integration

package testutil

import (
	"context"
	"database/sql"
	"fmt"
	"testing"
	"time"

	_ "github.com/jackc/pgx/v5/stdlib"
	"github.com/testcontainers/testcontainers-go"
	"github.com/testcontainers/testcontainers-go/modules/postgres"
	"github.com/testcontainers/testcontainers-go/wait"
)

// SetupTestDB starts a PostgreSQL testcontainer, runs migrations, and returns a connection.
// It returns the database connection and a cleanup function that should be deferred.
func SetupTestDB(t *testing.T) (*sql.DB, func()) {
	t.Helper()

	ctx := context.Background()

	// Start PostgreSQL container
	pgContainer, err := postgres.Run(ctx,
		"docker.io/postgres:16-alpine",
		postgres.WithDatabase("testdb"),
		postgres.WithUsername("testuser"),
		postgres.WithPassword("testpass"),
		testcontainers.WithWaitStrategy(
			wait.ForLog("database system is ready to accept connections").
				WithOccurrence(2).
				WithStartupTimeout(60*time.Second),
		),
	)
	if err != nil {
		t.Fatalf("failed to start postgres container: %v", err)
	}

	// Get connection string
	connStr, err := pgContainer.ConnectionString(ctx, "sslmode=disable")
	if err != nil {
		t.Fatalf("failed to get connection string: %v", err)
	}

	// Connect to database
	db, err := sql.Open("pgx", connStr)
	if err != nil {
		t.Fatalf("failed to connect to database: %v", err)
	}

	// Verify connection
	if err := db.PingContext(ctx); err != nil {
		t.Fatalf("failed to ping database: %v", err)
	}

	// Run migrations
	if err := runMigrations(db); err != nil {
		t.Fatalf("failed to run migrations: %v", err)
	}

	// Return cleanup function
	cleanup := func() {
		_ = db.Close()
		if err := pgContainer.Terminate(ctx); err != nil {
			t.Logf("failed to terminate container: %v", err)
		}
	}

	return db, cleanup
}

// runMigrations applies the schema to the test database
func runMigrations(db *sql.DB) error {
	// Create surahs table
	surahsSchema := `
	CREATE TABLE IF NOT EXISTS surahs (
		id SERIAL PRIMARY KEY,
		name_ar TEXT NOT NULL,
		name_en TEXT NOT NULL,
		revelation_place TEXT NOT NULL,
		ayah_count INTEGER NOT NULL,
		metadata JSONB,
		created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
		updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
	);
	`

	// Create ayahs table
	ayahsSchema := `
	CREATE TABLE IF NOT EXISTS ayahs (
		id BIGSERIAL PRIMARY KEY,
		surah_id INTEGER NOT NULL REFERENCES surahs(id) ON DELETE CASCADE,
		ayah_number INTEGER NOT NULL,
		text_ar TEXT NOT NULL,
		text_en TEXT,
		transliteration TEXT,
		metadata JSONB,
		created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
		updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
		UNIQUE(surah_id, ayah_number)
	);
	`

	// Create asr_results table
	asrResultsSchema := `
	CREATE TABLE IF NOT EXISTS asr_results (
		session_id TEXT PRIMARY KEY,
		ayah_id BIGINT NOT NULL,
		audio_key TEXT NOT NULL,
		expected_text_ar TEXT,
		transcript TEXT NOT NULL,
		word_timestamps JSONB,
		wer DOUBLE PRECISION,
		alignment_object_key TEXT,
		created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
		updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
	);
	`

	// Create scoring_jobs table (mirrors db/migrations/20260102000000_scoring_job_state.up.sql)
	scoringJobsSchema := `
	CREATE TABLE IF NOT EXISTS scoring_jobs (
		session_id  TEXT PRIMARY KEY,
		user_id     TEXT,
		upload_key  TEXT        NOT NULL,
		surah_id    INTEGER     NOT NULL REFERENCES surahs(id),
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
	`

	// Execute migrations
	schemas := []string{surahsSchema, ayahsSchema, asrResultsSchema, scoringJobsSchema}
	for _, schema := range schemas {
		if _, err := db.Exec(schema); err != nil {
			return fmt.Errorf("failed to execute schema: %w", err)
		}
	}

	return nil
}

// CleanupTables truncates all tables for test isolation.
func CleanupTables(t *testing.T, db *sql.DB) {
	t.Helper()

	tables := []string{"asr_results", "ayahs", "surahs"}
	for _, table := range tables {
		_, err := db.Exec(fmt.Sprintf("TRUNCATE TABLE %s CASCADE", table))
		if err != nil {
			t.Fatalf("failed to truncate table %s: %v", table, err)
		}
	}
}

// WithTransaction wraps a test in a transaction that's rolled back after the test.
// This provides test isolation without requiring full table truncation.
func WithTransaction(t *testing.T, db *sql.DB, fn func(*sql.Tx)) {
	t.Helper()

	tx, err := db.Begin()
	if err != nil {
		t.Fatalf("failed to begin transaction: %v", err)
	}

	defer func() {
		if err := tx.Rollback(); err != nil && err != sql.ErrTxDone {
			t.Logf("failed to rollback transaction: %v", err)
		}
	}()

	fn(tx)
}
