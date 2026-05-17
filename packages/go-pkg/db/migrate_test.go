//go:build integration

package db_test

import (
	"context"
	"os"
	"path/filepath"
	"testing"
	"testing/fstest"

	_ "github.com/jackc/pgx/v5/stdlib"
	"github.com/stretchr/testify/require"

	"quran-project/packages/go-pkg/db"
)

func TestDirectoryLoader_List(t *testing.T) {
	if testing.Short() {
		t.Skip("skipping integration test in short mode")
	}

	// Create temporary directory with migration files
	tmpDir := t.TempDir()

	migrations := map[string]string{
		"001_create_users.sql":    "CREATE TABLE users (id SERIAL PRIMARY KEY);",
		"002_create_posts.sql":    "CREATE TABLE posts (id SERIAL PRIMARY KEY, user_id INT);",
		"003_create_comments.sql": "CREATE TABLE comments (id SERIAL PRIMARY KEY, post_id INT);",
	}

	for name, content := range migrations {
		err := os.WriteFile(filepath.Join(tmpDir, name), []byte(content), 0644)
		require.NoError(t, err)
	}

	loader := db.DirectoryLoader{Dir: tmpDir}

	t.Run("loads migrations in order", func(t *testing.T) {
		migs, err := loader.List(context.Background())

		require.NoError(t, err)
		require.Len(t, migs, 3)

		// Verify ordering
		require.Equal(t, "001_create_users.sql", migs[0].Name)
		require.Equal(t, "002_create_posts.sql", migs[1].Name)
		require.Equal(t, "003_create_comments.sql", migs[2].Name)

		// Verify content
		require.Contains(t, migs[0].Content, "CREATE TABLE users")
		require.Contains(t, migs[1].Content, "CREATE TABLE posts")
	})

	t.Run("ignores non-sql files", func(t *testing.T) {
		// Add non-SQL files
		err := os.WriteFile(filepath.Join(tmpDir, "README.md"), []byte("# Migrations"), 0644)
		require.NoError(t, err)

		err = os.WriteFile(filepath.Join(tmpDir, "config.json"), []byte("{}"), 0644)
		require.NoError(t, err)

		migs, err := loader.List(context.Background())

		require.NoError(t, err)
		require.Len(t, migs, 3) // Should still only have 3 SQL files
	})

	t.Run("ignores subdirectories", func(t *testing.T) {
		subdir := filepath.Join(tmpDir, "old")
		err := os.Mkdir(subdir, 0755)
		require.NoError(t, err)

		err = os.WriteFile(filepath.Join(subdir, "004_old.sql"), []byte("CREATE TABLE old;"), 0644)
		require.NoError(t, err)

		migs, err := loader.List(context.Background())

		require.NoError(t, err)
		require.Len(t, migs, 3) // Should still only have 3 SQL files in root
	})

	t.Run("returns error for non-existent directory", func(t *testing.T) {
		loader := db.DirectoryLoader{Dir: "/non/existent/path"}

		_, err := loader.List(context.Background())

		require.Error(t, err)
		require.Contains(t, err.Error(), "read migrations dir")
	})

	t.Run("respects context cancellation", func(t *testing.T) {
		ctx, cancel := context.WithCancel(context.Background())
		cancel() // Cancel immediately

		_, err := loader.List(ctx)

		require.Error(t, err)
		require.ErrorIs(t, err, context.Canceled)
	})
}

func TestStaticLoader_List(t *testing.T) {
	mapFS := fstest.MapFS{
		"migrations/001_init.sql":   {Data: []byte("CREATE TABLE test1;")},
		"migrations/002_update.sql": {Data: []byte("CREATE TABLE test2;")},
		"migrations/README.md":      {Data: []byte("# Migrations")},
	}

	loader := db.StaticLoader{
		FS:   mapFS,
		Root: "migrations",
	}

	t.Run("loads migrations from embedded filesystem", func(t *testing.T) {
		migs, err := loader.List(context.Background())

		require.NoError(t, err)
		require.Len(t, migs, 2)

		// Verify ordering
		require.Equal(t, "001_init.sql", migs[0].Name)
		require.Equal(t, "002_update.sql", migs[1].Name)

		// Verify content
		require.Equal(t, "CREATE TABLE test1;", migs[0].Content)
		require.Equal(t, "CREATE TABLE test2;", migs[1].Content)
	})

	t.Run("respects context cancellation", func(t *testing.T) {
		ctx, cancel := context.WithCancel(context.Background())
		cancel()

		_, err := loader.List(ctx)

		require.Error(t, err)
		require.ErrorIs(t, err, context.Canceled)
	})
}

func TestApplyMigrations(t *testing.T) {
	if testing.Short() {
		t.Skip("skipping integration test in short mode")
	}

	dsn, cleanup := setupTestPostgres(t)
	defer cleanup()

	conn, err := db.Connect(context.Background(), db.Config{DSN: dsn})
	require.NoError(t, err)
	defer conn.Close()

	t.Run("applies migrations successfully", func(t *testing.T) {
		mapFS := fstest.MapFS{
			"001_users.sql": {Data: []byte("CREATE TABLE users (id SERIAL PRIMARY KEY, name TEXT);")},
			"002_posts.sql": {Data: []byte("CREATE TABLE posts (id SERIAL PRIMARY KEY, user_id INT);")},
		}

		loader := db.StaticLoader{FS: mapFS, Root: "."}

		err := db.ApplyMigrations(context.Background(), conn, loader)
		require.NoError(t, err)

		// Verify tables exist
		var tableName string
		err = conn.QueryRow("SELECT table_name FROM information_schema.tables WHERE table_name = 'users'").Scan(&tableName)
		require.NoError(t, err)
		require.Equal(t, "users", tableName)

		err = conn.QueryRow("SELECT table_name FROM information_schema.tables WHERE table_name = 'posts'").Scan(&tableName)
		require.NoError(t, err)
		require.Equal(t, "posts", tableName)
	})

	t.Run("rolls back on error", func(t *testing.T) {
		// New connection to avoid table conflicts
		conn2, err := db.Connect(context.Background(), db.Config{DSN: dsn})
		require.NoError(t, err)
		defer conn2.Close()

		mapFS := fstest.MapFS{
			"001_valid.sql":   {Data: []byte("CREATE TABLE valid_table (id SERIAL PRIMARY KEY);")},
			"002_invalid.sql": {Data: []byte("CREATE TABLE invalid SYNTAX ERROR;")}, // Invalid SQL
		}

		loader := db.StaticLoader{FS: mapFS, Root: "."}

		err = db.ApplyMigrations(context.Background(), conn2, loader)
		require.Error(t, err)
		require.Contains(t, err.Error(), "apply migration")

		// Verify rollback - valid_table should NOT exist
		var count int
		err = conn2.QueryRow("SELECT COUNT(*) FROM information_schema.tables WHERE table_name = 'valid_table'").Scan(&count)
		require.NoError(t, err)
		require.Equal(t, 0, count, "table should not exist due to rollback")
	})

	t.Run("handles empty migration list", func(t *testing.T) {
		conn3, err := db.Connect(context.Background(), db.Config{DSN: dsn})
		require.NoError(t, err)
		defer conn3.Close()

		mapFS := fstest.MapFS{}
		loader := db.StaticLoader{FS: mapFS, Root: "."}

		err = db.ApplyMigrations(context.Background(), conn3, loader)
		require.NoError(t, err) // Empty migration list should succeed
	})

	t.Run("respects context cancellation", func(t *testing.T) {
		conn4, err := db.Connect(context.Background(), db.Config{DSN: dsn})
		require.NoError(t, err)
		defer conn4.Close()

		ctx, cancel := context.WithCancel(context.Background())
		cancel() // Cancel immediately

		mapFS := fstest.MapFS{
			"001_test.sql": {Data: []byte("CREATE TABLE test (id SERIAL);")},
		}

		loader := db.StaticLoader{FS: mapFS, Root: "."}

		err = db.ApplyMigrations(ctx, conn4, loader)
		require.Error(t, err)
	})
}

func TestMustApplyMigrations(t *testing.T) {
	if testing.Short() {
		t.Skip("skipping integration test in short mode")
	}

	dsn, cleanup := setupTestPostgres(t)
	defer cleanup()

	conn, err := db.Connect(context.Background(), db.Config{DSN: dsn})
	require.NoError(t, err)
	defer conn.Close()

	t.Run("succeeds without panic", func(t *testing.T) {
		mapFS := fstest.MapFS{
			"001_simple.sql": {Data: []byte("CREATE TABLE simple (id SERIAL PRIMARY KEY);")},
		}

		loader := db.StaticLoader{FS: mapFS, Root: "."}

		require.NotPanics(t, func() {
			db.MustApplyMigrations(context.Background(), conn, loader)
		})
	})

	t.Run("panics on error", func(t *testing.T) {
		conn2, err := db.Connect(context.Background(), db.Config{DSN: dsn})
		require.NoError(t, err)
		defer conn2.Close()

		mapFS := fstest.MapFS{
			"001_invalid.sql": {Data: []byte("INVALID SQL SYNTAX;")},
		}

		loader := db.StaticLoader{FS: mapFS, Root: "."}

		require.Panics(t, func() {
			db.MustApplyMigrations(context.Background(), conn2, loader)
		})
	})
}

func TestMigrationIdempotency(t *testing.T) {
	if testing.Short() {
		t.Skip("skipping integration test in short mode")
	}

	dsn, cleanup := setupTestPostgres(t)
	defer cleanup()

	conn, err := db.Connect(context.Background(), db.Config{DSN: dsn})
	require.NoError(t, err)
	defer conn.Close()

	t.Run("applying same migrations twice with IF NOT EXISTS", func(t *testing.T) {
		mapFS := fstest.MapFS{
			"001_idempotent.sql": {Data: []byte("CREATE TABLE IF NOT EXISTS idempotent (id SERIAL PRIMARY KEY);")},
		}

		loader := db.StaticLoader{FS: mapFS, Root: "."}

		// First application
		err := db.ApplyMigrations(context.Background(), conn, loader)
		require.NoError(t, err)

		// Second application - should succeed due to IF NOT EXISTS
		err = db.ApplyMigrations(context.Background(), conn, loader)
		require.NoError(t, err)
	})
}
