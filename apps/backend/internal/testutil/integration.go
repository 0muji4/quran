//go:build integration
// +build integration

package testutil

import (
	"context"
	"fmt"
	"testing"

	"github.com/testcontainers/testcontainers-go"
)

// RedisClient is a minimal interface for Redis operations needed in tests
type RedisClient interface {
	Do(ctx context.Context, args ...string) (interface{}, error)
	Close() error
}

// simpleRedisClient wraps basic Redis operations
type simpleRedisClient struct {
	host string
	port string
}

// SetupTestRedis starts a Redis testcontainer and returns connection info
func SetupTestRedis(t *testing.T) (string, func()) {
	t.Helper()

	ctx := context.Background()

	req := testcontainers.ContainerRequest{
		Image:        "docker.io/redis:7-alpine",
		ExposedPorts: []string{"6379/tcp"},
	}

	redisContainer, err := testcontainers.GenericContainer(ctx, testcontainers.GenericContainerRequest{
		ContainerRequest: req,
		Started:          true,
	})
	if err != nil {
		t.Fatalf("failed to start redis container: %v", err)
	}

	host, err := redisContainer.Host(ctx)
	if err != nil {
		t.Fatalf("failed to get redis host: %v", err)
	}

	port, err := redisContainer.MappedPort(ctx, "6379")
	if err != nil {
		t.Fatalf("failed to get redis port: %v", err)
	}

	redisURL := fmt.Sprintf("redis://%s:%s/0", host, port.Port())

	cleanup := func() {
		if err := redisContainer.Terminate(ctx); err != nil {
			t.Logf("failed to terminate redis container: %v", err)
		}
	}

	return redisURL, cleanup
}

// MinIOClient represents a minimal MinIO client interface for testing
type MinIOClient interface {
	PutObject(ctx context.Context, bucketName, objectName string, data []byte) error
	GetObject(ctx context.Context, bucketName, objectName string) ([]byte, error)
	RemoveObject(ctx context.Context, bucketName, objectName string) error
	BucketExists(ctx context.Context, bucketName string) (bool, error)
	MakeBucket(ctx context.Context, bucketName string) error
}

// SetupTestMinIO starts a MinIO testcontainer and returns connection info
func SetupTestMinIO(t *testing.T) (endpoint, accessKey, secretKey string, cleanup func()) {
	t.Helper()

	ctx := context.Background()

	req := testcontainers.ContainerRequest{
		Image:        "docker.io/minio/minio:latest",
		ExposedPorts: []string{"9000/tcp"},
		Env: map[string]string{
			"MINIO_ROOT_USER":     "minioadmin",
			"MINIO_ROOT_PASSWORD": "minioadmin",
		},
		Cmd: []string{"server", "/data"},
	}

	minioContainer, err := testcontainers.GenericContainer(ctx, testcontainers.GenericContainerRequest{
		ContainerRequest: req,
		Started:          true,
	})
	if err != nil {
		t.Fatalf("failed to start minio container: %v", err)
	}

	host, err := minioContainer.Host(ctx)
	if err != nil {
		t.Fatalf("failed to get minio host: %v", err)
	}

	port, err := minioContainer.MappedPort(ctx, "9000")
	if err != nil {
		t.Fatalf("failed to get minio port: %v", err)
	}

	endpoint = fmt.Sprintf("%s:%s", host, port.Port())
	accessKey = "minioadmin"
	secretKey = "minioadmin"

	cleanupFunc := func() {
		if err := minioContainer.Terminate(ctx); err != nil {
			t.Logf("failed to terminate minio container: %v", err)
		}
	}

	return endpoint, accessKey, secretKey, cleanupFunc
}

// SkipIfShort skips the test if running in short mode
func SkipIfShort(t *testing.T) {
	if testing.Short() {
		t.Skip("skipping integration test in short mode")
	}
}
