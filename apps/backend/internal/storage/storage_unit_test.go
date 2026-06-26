package storage_test

import (
	"errors"
	"testing"

	"quran-project/apps/backend/internal/storage"
)

func TestErrObjectNotFoundIsSentinel(t *testing.T) {
	wrapped := errors.New("wrapping: " + storage.ErrObjectNotFound.Error())
	if errors.Is(wrapped, storage.ErrObjectNotFound) {
		t.Fatalf("plain string wrap should not match the sentinel")
	}
	if !errors.Is(storage.ErrObjectNotFound, storage.ErrObjectNotFound) {
		t.Fatalf("sentinel must match itself via errors.Is")
	}
}
