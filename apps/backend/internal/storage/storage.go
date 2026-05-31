// Package storage provides a narrow object-storage contract used by the
// backend to fetch user-uploaded audio (and similar blobs) by key.
//
// The interface is intentionally minimal so callers can be tested against a
// fake and the production backend (MinIO locally, S3-compatible providers
// like Cloudflare R2 in cloud) can be swapped without touching handler or
// scoring code.
package storage

import (
	"context"
	"io"
)

// ObjectStore reads opaque blobs by storage key (for example
// "uploads/abc.opus"). Implementations must return ErrObjectNotFound when
// the key does not exist so callers can map it to a 404 response.
type ObjectStore interface {
	Get(ctx context.Context, key string) (io.ReadCloser, error)
}
