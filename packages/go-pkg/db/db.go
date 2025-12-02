package db

import (
	"context"
	"database/sql"
	"errors"
	"fmt"
	"time"
)

// Config captures database connection tuning knobs for Postgres.
type Config struct {
	// DSN is a postgres connection string, e.g. postgres://user:pass@host:5432/dbname
	DSN string

	// DriverName allows callers to specify a database/sql driver (e.g. "pgx" or "postgres").
	DriverName string

	MaxOpenConns    int
	MaxIdleConns    int
	ConnMaxLifetime time.Duration
}

// Connect opens a Postgres connection using the pgx stdlib driver and applies basic pooling settings.
func Connect(ctx context.Context, cfg Config) (*sql.DB, error) {
	if cfg.DSN == "" {
		return nil, errors.New("db: DSN is required")
	}

	driver := cfg.DriverName
	if driver == "" {
		driver = "postgres"
	}

	conn, err := sql.Open(driver, cfg.DSN)
	if err != nil {
		return nil, fmt.Errorf("db: open connection: %w", err)
	}

	if cfg.MaxOpenConns > 0 {
		conn.SetMaxOpenConns(cfg.MaxOpenConns)
	}
	if cfg.MaxIdleConns > 0 {
		conn.SetMaxIdleConns(cfg.MaxIdleConns)
	}
	if cfg.ConnMaxLifetime > 0 {
		conn.SetConnMaxLifetime(cfg.ConnMaxLifetime)
	}

	if err := conn.PingContext(ctx); err != nil {
		return nil, fmt.Errorf("db: ping: %w", err)
	}

	return conn, nil
}
