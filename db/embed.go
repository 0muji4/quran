// Package db embeds the canonical `*.up.sql` migration files so test code
// (and any future in-process tooling) can apply the same schema that the
// `make db-migrate` CLI runs against dev / prod, without reaching into
// the filesystem.
//
// Only the `*.up.sql` files are embedded. Down migrations are intentionally
// excluded so a single-shot ApplyMigrations call against this FS produces
// the forward-only schema; reversal lives with the golang-migrate CLI.
package db

import "embed"

// MigrationsFS holds the embedded `*.up.sql` migration files. Walk it with
// the matching loader (e.g. packages/go-pkg/db.StaticLoader) rooted at the
// "migrations" subdirectory.
//
//go:embed migrations/*.up.sql
var MigrationsFS embed.FS
