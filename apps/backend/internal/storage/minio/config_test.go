package minio_test

import (
	"testing"

	"quran-project/apps/backend/internal/storage/minio"
)

func TestNewStoreRejectsMissingConfig(t *testing.T) {
	cases := []struct {
		name string
		cfg  minio.Config
	}{
		{"empty endpoint", minio.Config{Bucket: "x"}},
		{"empty bucket", minio.Config{Endpoint: "localhost:9000"}},
	}
	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			if _, err := minio.NewStore(tc.cfg); err == nil {
				t.Fatalf("expected error for %+v, got nil", tc.cfg)
			}
		})
	}
}
