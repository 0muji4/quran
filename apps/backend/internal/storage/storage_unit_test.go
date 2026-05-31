package storage_test

import (
	"errors"
	"testing"

	"quran-project/apps/backend/internal/storage"
)

func TestNewMinIOStoreRejectsMissingConfig(t *testing.T) {
	cases := []struct {
		name string
		cfg  storage.Config
	}{
		{"empty endpoint", storage.Config{Bucket: "x"}},
		{"empty bucket", storage.Config{Endpoint: "localhost:9000"}},
	}
	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			if _, err := storage.NewMinIOStore(tc.cfg); err == nil {
				t.Fatalf("expected error for %+v, got nil", tc.cfg)
			}
		})
	}
}

func TestErrObjectNotFoundIsSentinel(t *testing.T) {
	wrapped := errors.New("wrapping: " + storage.ErrObjectNotFound.Error())
	if errors.Is(wrapped, storage.ErrObjectNotFound) {
		t.Fatalf("plain string wrap should not match the sentinel")
	}
	if !errors.Is(storage.ErrObjectNotFound, storage.ErrObjectNotFound) {
		t.Fatalf("sentinel must match itself via errors.Is")
	}
}
