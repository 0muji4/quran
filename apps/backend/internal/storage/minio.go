package storage

import (
	"context"
	"errors"
	"fmt"
	"io"

	"github.com/minio/minio-go/v7"
	"github.com/minio/minio-go/v7/pkg/credentials"
)

// Config configures a MinIOStore. Endpoint is the host:port (or hostname
// for HTTPS endpoints like Cloudflare R2's "<account>.r2.cloudflarestorage.com").
// UseSSL must be true for any non-localhost target.
type Config struct {
	Endpoint  string
	AccessKey string
	SecretKey string
	UseSSL    bool
	Bucket    string
	// Region is optional. R2 expects "auto"; AWS S3 expects a real region;
	// MinIO ignores it. Defaults to "us-east-1" so MinIO and most S3-compat
	// servers accept the request.
	Region string
}

// MinIOStore implements ObjectStore against any S3-compatible service via
// the minio-go client (local MinIO, Cloudflare R2, AWS S3, etc).
type MinIOStore struct {
	client *minio.Client
	bucket string
}

// NewMinIOStore constructs a MinIOStore from cfg. It does not verify bucket
// existence; callers that need that guarantee should call EnsureBucket
// during startup.
func NewMinIOStore(cfg Config) (*MinIOStore, error) {
	if cfg.Endpoint == "" {
		return nil, errors.New("storage: endpoint is required")
	}
	if cfg.Bucket == "" {
		return nil, errors.New("storage: bucket is required")
	}
	region := cfg.Region
	if region == "" {
		region = "us-east-1"
	}
	client, err := minio.New(cfg.Endpoint, &minio.Options{
		Creds:  credentials.NewStaticV4(cfg.AccessKey, cfg.SecretKey, ""),
		Secure: cfg.UseSSL,
		Region: region,
	})
	if err != nil {
		return nil, fmt.Errorf("storage: build client: %w", err)
	}
	return &MinIOStore{client: client, bucket: cfg.Bucket}, nil
}

// Get fetches an object by key. The caller owns the returned ReadCloser and
// must Close it. A missing object yields ErrObjectNotFound.
func (s *MinIOStore) Get(ctx context.Context, key string) (io.ReadCloser, error) {
	obj, err := s.client.GetObject(ctx, s.bucket, key, minio.GetObjectOptions{})
	if err != nil {
		return nil, fmt.Errorf("storage: get object: %w", err)
	}
	// minio-go defers existence checks to first read; surface a missing key
	// as ErrObjectNotFound so handlers can map it to 404 without parsing
	// SDK error codes downstream.
	if _, statErr := obj.Stat(); statErr != nil {
		_ = obj.Close()
		if errResp := minio.ToErrorResponse(statErr); errResp.Code == "NoSuchKey" || errResp.StatusCode == 404 {
			return nil, ErrObjectNotFound
		}
		return nil, fmt.Errorf("storage: stat object: %w", statErr)
	}
	return obj, nil
}

// EnsureBucket creates the configured bucket if it does not already exist.
// Useful in development against a fresh MinIO; production deploys against
// pre-provisioned buckets can skip this.
func (s *MinIOStore) EnsureBucket(ctx context.Context) error {
	exists, err := s.client.BucketExists(ctx, s.bucket)
	if err != nil {
		return fmt.Errorf("storage: bucket exists check: %w", err)
	}
	if exists {
		return nil
	}
	if err := s.client.MakeBucket(ctx, s.bucket, minio.MakeBucketOptions{}); err != nil {
		return fmt.Errorf("storage: make bucket: %w", err)
	}
	return nil
}

// Put uploads a blob at key. Only used by tests today (production uploads
// come from the mobile clients via presigned PUTs); kept on the struct so
// the test container fixture in testutil does not duplicate minio-go usage.
func (s *MinIOStore) Put(ctx context.Context, key string, body io.Reader, size int64, contentType string) error {
	if _, err := s.client.PutObject(ctx, s.bucket, key, body, size, minio.PutObjectOptions{
		ContentType: contentType,
	}); err != nil {
		return fmt.Errorf("storage: put object: %w", err)
	}
	return nil
}
