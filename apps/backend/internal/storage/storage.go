// Package storage defines the object-storage port.
package storage

import (
	"context"
	"io"
)

// ObjectStore reads blobs by key, returning ErrObjectNotFound when absent.
type ObjectStore interface {
	Get(ctx context.Context, key string) (io.ReadCloser, error)
}
