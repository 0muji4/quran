//go:build integration

package minio_test

import (
	"bytes"
	"context"
	"errors"
	"io"
	"strings"
	"testing"
	"time"

	"github.com/stretchr/testify/require"

	"quran-project/apps/backend/internal/storage"
	"quran-project/apps/backend/internal/storage/minio"
	"quran-project/apps/backend/internal/testutil"
)

// waitForReady polls the store until EnsureBucket succeeds or the deadline
// passes. MinIO inside testcontainers needs a few hundred ms after its
// container reports "ready" before its HTTP listener accepts requests
// without reset; without this loop the first call here flakes.
func waitForReady(t *testing.T, store *minio.Store) {
	t.Helper()
	deadline := time.Now().Add(15 * time.Second)
	var lastErr error
	for time.Now().Before(deadline) {
		if err := store.EnsureBucket(context.Background()); err == nil {
			return
		} else {
			lastErr = err
		}
		time.Sleep(200 * time.Millisecond)
	}
	t.Fatalf("minio did not become ready within deadline: %v", lastErr)
}

func TestMinIOStoreRoundTrip(t *testing.T) {
	testutil.SkipIfShort(t)

	endpoint, accessKey, secretKey, cleanup := testutil.SetupTestMinIO(t)
	defer cleanup()

	const bucket = "round-trip-bucket"
	store, err := minio.NewStore(minio.Config{
		Endpoint:  endpoint,
		AccessKey: accessKey,
		SecretKey: secretKey,
		Bucket:    bucket,
	})
	require.NoError(t, err)

	waitForReady(t, store)

	ctx := context.Background()
	// Idempotent: a second call on an existing bucket must not error.
	require.NoError(t, store.EnsureBucket(ctx))

	const key = "uploads/sample.txt"
	payload := []byte("recording bytes")
	require.NoError(t, store.Put(ctx, key, bytes.NewReader(payload), int64(len(payload)), "application/octet-stream"))

	r, err := store.Get(ctx, key)
	require.NoError(t, err)
	t.Cleanup(func() { _ = r.Close() })

	got, err := io.ReadAll(r)
	require.NoError(t, err)
	require.Equal(t, payload, got)
}

func TestMinIOStoreGetMissingReturnsErrObjectNotFound(t *testing.T) {
	testutil.SkipIfShort(t)

	endpoint, accessKey, secretKey, cleanup := testutil.SetupTestMinIO(t)
	defer cleanup()

	store, err := minio.NewStore(minio.Config{
		Endpoint:  endpoint,
		AccessKey: accessKey,
		SecretKey: secretKey,
		Bucket:    "missing-key-bucket",
	})
	require.NoError(t, err)

	waitForReady(t, store)

	_, err = store.Get(context.Background(), "does-not-exist")
	if !errors.Is(err, storage.ErrObjectNotFound) {
		t.Fatalf("err = %v, want ErrObjectNotFound (wrapped chain: %q)", err, errorChain(err))
	}
}

// errorChain renders the Unwrap chain for diagnostic messages.
func errorChain(err error) string {
	var b strings.Builder
	for err != nil {
		if b.Len() > 0 {
			b.WriteString(" -> ")
		}
		b.WriteString(err.Error())
		err = errors.Unwrap(err)
	}
	return b.String()
}
