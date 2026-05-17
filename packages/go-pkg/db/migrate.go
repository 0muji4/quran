package db

import (
	"context"
	"database/sql"
	"fmt"
	"io/fs"
	"os"
	"path/filepath"
	"sort"
)

// MigrationLoader describes a source of migrations, enabling tests and CLI tools to share logic.
type MigrationLoader interface {
	List(ctx context.Context) ([]Migration, error)
}

// Migration represents a single SQL migration file.
type Migration struct {
	// Name is the filename of the migration (e.g. "20260102_init.up.sql").
	// Migrations are applied in lexicographic order by Name.
	Name string
	// Content is the raw SQL body executed inside the apply transaction.
	Content string
}

// DirectoryLoader loads migrations from a directory on disk.
type DirectoryLoader struct {
	Dir string
}

// List scans the directory for .sql files and returns them ordered by filename.
func (l DirectoryLoader) List(ctx context.Context) ([]Migration, error) {
	entries, err := os.ReadDir(l.Dir)
	if err != nil {
		return nil, fmt.Errorf("db: read migrations dir: %w", err)
	}

	var migrations []Migration
	for _, entry := range entries {
		select {
		case <-ctx.Done():
			return nil, ctx.Err()
		default:
		}

		if entry.IsDir() || filepath.Ext(entry.Name()) != ".sql" {
			continue
		}

		path := filepath.Join(l.Dir, entry.Name())
		data, err := os.ReadFile(path)
		if err != nil {
			return nil, fmt.Errorf("db: read migration %s: %w", entry.Name(), err)
		}

		migrations = append(migrations, Migration{
			Name:    entry.Name(),
			Content: string(data),
		})
	}

	sort.Slice(migrations, func(i, j int) bool {
		return migrations[i].Name < migrations[j].Name
	})

	return migrations, nil
}

// ApplyMigrations executes each migration sequentially in a single transaction.
// It intentionally stays minimal: callers can provide their own tracking table if needed.
func ApplyMigrations(ctx context.Context, conn *sql.DB, loader MigrationLoader) error {
	migrations, err := loader.List(ctx)
	if err != nil {
		return err
	}

	tx, err := conn.BeginTx(ctx, nil)
	if err != nil {
		return fmt.Errorf("db: begin tx: %w", err)
	}

	for _, m := range migrations {
		if _, err := tx.ExecContext(ctx, m.Content); err != nil {
			_ = tx.Rollback()
			return fmt.Errorf("db: apply migration %s: %w", m.Name, err)
		}
	}

	if err := tx.Commit(); err != nil {
		return fmt.Errorf("db: commit migrations: %w", err)
	}

	return nil
}

// MustApplyMigrations is a convenience wrapper that panics if migrations fail.
func MustApplyMigrations(ctx context.Context, conn *sql.DB, loader MigrationLoader) {
	if err := ApplyMigrations(ctx, conn, loader); err != nil {
		panic(err)
	}
}

// StaticLoader builds a MigrationLoader from an fs.FS, enabling embedding via go:embed.
type StaticLoader struct {
	// FS holds the migration source, typically constructed via go:embed.
	FS fs.FS
	// Root scopes the walk to this subdirectory of FS.
	Root string
}

// List walks the provided fs and loads SQL files relative to Root.
func (l StaticLoader) List(ctx context.Context) ([]Migration, error) {
	var migrations []Migration

	err := fs.WalkDir(l.FS, l.Root, func(path string, d fs.DirEntry, err error) error {
		if err != nil {
			return err
		}

		select {
		case <-ctx.Done():
			return ctx.Err()
		default:
		}

		if d.IsDir() || filepath.Ext(d.Name()) != ".sql" {
			return nil
		}

		data, readErr := fs.ReadFile(l.FS, path)
		if readErr != nil {
			return fmt.Errorf("db: read embedded migration %s: %w", path, readErr)
		}

		migrations = append(migrations, Migration{
			Name:    filepath.Base(path),
			Content: string(data),
		})
		return nil
	})

	if err != nil {
		return nil, err
	}

	sort.Slice(migrations, func(i, j int) bool { return migrations[i].Name < migrations[j].Name })
	return migrations, nil
}
