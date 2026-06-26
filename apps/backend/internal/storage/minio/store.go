// Package minio adapts an S3-compatible object store to storage.ObjectStore.
package minio

import (
	"context"
	"errors"
	"fmt"
	"io"

	minioclient "github.com/minio/minio-go/v7"
	"github.com/minio/minio-go/v7/pkg/credentials"

	"quran-project/apps/backend/internal/storage"
)

type Config struct {
	Endpoint  string
	AccessKey string
	SecretKey string
	UseSSL    bool
	Bucket    string
	Region    string
}

type Store struct {
	client *minioclient.Client
	bucket string
}

// NewStore does not verify the bucket exists; call EnsureBucket for that.
func NewStore(cfg Config) (*Store, error) {
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
	client, err := minioclient.New(cfg.Endpoint, &minioclient.Options{
		Creds:  credentials.NewStaticV4(cfg.AccessKey, cfg.SecretKey, ""),
		Secure: cfg.UseSSL,
		Region: region,
	})
	if err != nil {
		return nil, fmt.Errorf("storage: build client: %w", err)
	}
	return &Store{client: client, bucket: cfg.Bucket}, nil
}

// Get returns a ReadCloser the caller must Close, or storage.ErrObjectNotFound.
func (s *Store) Get(ctx context.Context, key string) (io.ReadCloser, error) {
	obj, err := s.client.GetObject(ctx, s.bucket, key, minioclient.GetObjectOptions{})
	if err != nil {
		return nil, fmt.Errorf("storage: get object: %w", err)
	}
	if _, statErr := obj.Stat(); statErr != nil {
		_ = obj.Close()
		if errResp := minioclient.ToErrorResponse(statErr); errResp.Code == "NoSuchKey" || errResp.StatusCode == 404 {
			return nil, storage.ErrObjectNotFound
		}
		return nil, fmt.Errorf("storage: stat object: %w", statErr)
	}
	return obj, nil
}

// EnsureBucket creates the bucket if absent.
func (s *Store) EnsureBucket(ctx context.Context) error {
	exists, err := s.client.BucketExists(ctx, s.bucket)
	if err != nil {
		return fmt.Errorf("storage: bucket exists check: %w", err)
	}
	if exists {
		return nil
	}
	if err := s.client.MakeBucket(ctx, s.bucket, minioclient.MakeBucketOptions{}); err != nil {
		return fmt.Errorf("storage: make bucket: %w", err)
	}
	return nil
}

// Put uploads a blob at key.
func (s *Store) Put(ctx context.Context, key string, body io.Reader, size int64, contentType string) error {
	if _, err := s.client.PutObject(ctx, s.bucket, key, body, size, minioclient.PutObjectOptions{
		ContentType: contentType,
	}); err != nil {
		return fmt.Errorf("storage: put object: %w", err)
	}
	return nil
}
