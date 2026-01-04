//go:build integration
// +build integration

package db_test

import (
	"context"
	"database/sql"
	"testing"
	"time"

	_ "github.com/jackc/pgx/v5/stdlib"
	"github.com/stretchr/testify/require"
	"github.com/testcontainers/testcontainers-go"
	"github.com/testcontainers/testcontainers-go/modules/postgres"
	"github.com/testcontainers/testcontainers-go/wait"

	"quran-project/packages/go-pkg/db"
)

func setupTestPostgres(t *testing.T) (string, func()) {
	t.Helper()

	ctx := context.Background()

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

	connStr, err := pgContainer.ConnectionString(ctx, "sslmode=disable")
	if err != nil {
		t.Fatalf("failed to get connection string: %v", err)
	}

	cleanup := func() {
		if err := pgContainer.Terminate(ctx); err != nil {
			t.Logf("failed to terminate container: %v", err)
		}
	}

	return connStr, cleanup
}

func TestConnect_ValidDSN(t *testing.T) {
	if testing.Short() {
		t.Skip("skipping integration test in short mode")
	}

	dsn, cleanup := setupTestPostgres(t)
	defer cleanup()

	cfg := db.Config{
		DSN:             dsn,
		MaxOpenConns:    10,
		MaxIdleConns:    5,
		ConnMaxLifetime: 5 * time.Minute,
	}

	conn, err := db.Connect(context.Background(), cfg)
	require.NoError(t, err)
	require.NotNil(t, conn)
	defer conn.Close()

	// Verify connection is working
	err = conn.PingContext(context.Background())
	require.NoError(t, err)

	// Verify pool settings were applied (these are internal, but we can verify connection works)
	stats := conn.Stats()
	require.Equal(t, 10, stats.MaxOpenConnections)
}

func TestConnect_InvalidDSN(t *testing.T) {
	if testing.Short() {
		t.Skip("skipping integration test in short mode")
	}

	cfg := db.Config{
		DSN: "postgres://invalid:invalid@localhost:9999/invalid",
	}

	ctx, cancel := context.WithTimeout(context.Background(), 2*time.Second)
	defer cancel()

	conn, err := db.Connect(ctx, cfg)

	require.Error(t, err)
	require.Contains(t, err.Error(), "ping")

	if conn != nil {
		conn.Close()
	}
}

func TestConnect_EmptyDSN(t *testing.T) {
	cfg := db.Config{
		DSN: "",
	}

	_, err := db.Connect(context.Background(), cfg)

	require.Error(t, err)
	require.Contains(t, err.Error(), "DSN is required")
}

func TestConnect_CustomDriverName(t *testing.T) {
	if testing.Short() {
		t.Skip("skipping integration test in short mode")
	}

	dsn, cleanup := setupTestPostgres(t)
	defer cleanup()

	cfg := db.Config{
		DSN:        dsn,
		DriverName: "pgx",
	}

	conn, err := db.Connect(context.Background(), cfg)
	require.NoError(t, err)
	require.NotNil(t, conn)
	defer conn.Close()

	err = conn.PingContext(context.Background())
	require.NoError(t, err)
}

func TestConnect_DefaultDriver(t *testing.T) {
	if testing.Short() {
		t.Skip("skipping integration test in short mode")
	}

	dsn, cleanup := setupTestPostgres(t)
	defer cleanup()

	cfg := db.Config{
		DSN: dsn,
		// DriverName not set, should default to "postgres"
	}

	conn, err := db.Connect(context.Background(), cfg)
	require.NoError(t, err)
	require.NotNil(t, conn)
	defer conn.Close()

	err = conn.PingContext(context.Background())
	require.NoError(t, err)
}

func TestConnect_PoolSettings(t *testing.T) {
	if testing.Short() {
		t.Skip("skipping integration test in short mode")
	}

	dsn, cleanup := setupTestPostgres(t)
	defer cleanup()

	cfg := db.Config{
		DSN:             dsn,
		MaxOpenConns:    25,
		MaxIdleConns:    10,
		ConnMaxLifetime: 10 * time.Minute,
	}

	conn, err := db.Connect(context.Background(), cfg)
	require.NoError(t, err)
	require.NotNil(t, conn)
	defer conn.Close()

	stats := conn.Stats()
	require.Equal(t, 25, stats.MaxOpenConnections)
}

func TestConnect_ContextCancellation(t *testing.T) {
	if testing.Short() {
		t.Skip("skipping integration test in short mode")
	}

	dsn, cleanup := setupTestPostgres(t)
	defer cleanup()

	ctx, cancel := context.WithCancel(context.Background())

	cfg := db.Config{
		DSN: dsn,
	}

	// Start connection in a goroutine
	errChan := make(chan error, 1)
	go func() {
		_, err := db.Connect(ctx, cfg)
		errChan <- err
	}()

	// Cancel context immediately
	cancel()

	// The connection should eventually fail or succeed quickly
	// We can't guarantee it will fail because the connection might succeed before cancellation
	select {
	case err := <-errChan:
		if err != nil {
			require.Contains(t, err.Error(), "context canceled")
		}
	case <-time.After(5 * time.Second):
		t.Fatal("connection did not complete within timeout")
	}
}

func TestConnect_PingFailure(t *testing.T) {
	if testing.Short() {
		t.Skip("skipping integration test in short mode")
	}

	// Use a port that's definitely not listening
	cfg := db.Config{
		DSN: "postgres://user:pass@localhost:54321/db?sslmode=disable&connect_timeout=1",
	}

	ctx, cancel := context.WithTimeout(context.Background(), 3*time.Second)
	defer cancel()

	_, err := db.Connect(ctx, cfg)

	require.Error(t, err)
	require.Contains(t, err.Error(), "ping")
}

func TestConnect_MultipleConnections(t *testing.T) {
	if testing.Short() {
		t.Skip("skipping integration test in short mode")
	}

	dsn, cleanup := setupTestPostgres(t)
	defer cleanup()

	cfg := db.Config{
		DSN:          dsn,
		MaxOpenConns: 5,
		MaxIdleConns: 2,
	}

	// Create multiple connections to verify pool works correctly
	connections := make([]*sql.DB, 3)
	for i := 0; i < 3; i++ {
		conn, err := db.Connect(context.Background(), cfg)
		require.NoError(t, err, "connection %d failed", i)
		require.NotNil(t, conn)
		connections[i] = conn
	}

	// Cleanup all connections
	for i, conn := range connections {
		err := conn.Close()
		require.NoError(t, err, "closing connection %d failed", i)
	}
}
