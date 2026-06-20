//go:build integration

package testutil

import (
	"context"
	"database/sql"
	"fmt"
	"strings"
	"testing"
	"time"

	_ "github.com/jackc/pgx/v5/stdlib"
	"github.com/testcontainers/testcontainers-go"
	"github.com/testcontainers/testcontainers-go/modules/postgres"
	"github.com/testcontainers/testcontainers-go/wait"

	migrationsfs "quran-project/db"
	migrate "quran-project/packages/go-pkg/db"
)

// SetupTestDB starts a PostgreSQL testcontainer, applies the canonical
// `db/migrations/*.up.sql` set, and returns a ready-to-use connection
// plus a cleanup function that should be deferred.
//
// The same migration files run against dev / prod via `make db-migrate`
// run here, so a new migration cannot land without the test schema
// catching up. This replaced a hand-rolled schema list that drifted from
// production and broke CI in PR #454.
func SetupTestDB(t *testing.T) (*sql.DB, func()) {
	t.Helper()

	ctx := context.Background()

	// Pin the test container to the same Postgres major as Neon dev and
	// the local docker-compose stack (PR #451). Matching the prod major
	// avoids version-skew bugs (JSONB / numeric / window-function edge
	// cases) only surfacing post-deploy.
	pgContainer, err := postgres.Run(ctx,
		"docker.io/postgres:18-alpine",
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

	connStr, err := pgContainer.ConnectionString(ctx, "sslmode=disable")
	if err != nil {
		t.Fatalf("failed to get connection string: %v", err)
	}

	db, err := sql.Open("pgx", connStr)
	if err != nil {
		t.Fatalf("failed to connect to database: %v", err)
	}

	if err := db.PingContext(ctx); err != nil {
		t.Fatalf("failed to ping database: %v", err)
	}

	if err := migrate.ApplyMigrations(ctx, db, migrate.StaticLoader{
		FS:   migrationsfs.MigrationsFS,
		Root: "migrations",
	}); err != nil {
		t.Fatalf("failed to apply migrations: %v", err)
	}

	cleanup := func() {
		_ = db.Close()
		if err := pgContainer.Terminate(ctx); err != nil {
			t.Logf("failed to terminate container: %v", err)
		}
	}

	return db, cleanup
}

// CleanupTables truncates every user table in the public schema for test
// isolation. Discovering the table set at runtime keeps the cleanup in
// step with the migrations automatically — adding a new table no longer
// requires updating a hand-maintained list.
func CleanupTables(t *testing.T, db *sql.DB) {
	t.Helper()

	rows, err := db.Query(`
		SELECT tablename FROM pg_tables
		WHERE schemaname = 'public' AND tablename != 'schema_migrations'
	`)
	if err != nil {
		t.Fatalf("failed to list tables: %v", err)
	}
	defer rows.Close()

	var tables []string
	for rows.Next() {
		var name string
		if err := rows.Scan(&name); err != nil {
			t.Fatalf("failed to scan table name: %v", err)
		}
		// Quote each identifier so reserved words and mixed case both work.
		tables = append(tables, fmt.Sprintf("%q", name))
	}
	if err := rows.Err(); err != nil {
		t.Fatalf("failed to iterate tables: %v", err)
	}
	if len(tables) == 0 {
		return
	}

	// One TRUNCATE statement is cheaper than per-table, and RESTART
	// IDENTITY keeps SERIAL sequences predictable between tests.
	stmt := fmt.Sprintf("TRUNCATE TABLE %s RESTART IDENTITY CASCADE", strings.Join(tables, ", "))
	if _, err := db.Exec(stmt); err != nil {
		t.Fatalf("failed to truncate tables: %v", err)
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
