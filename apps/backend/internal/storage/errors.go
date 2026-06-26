package storage

import "errors"

// ErrObjectNotFound is returned by ObjectStore.Get when the key is absent.
var ErrObjectNotFound = errors.New("storage: object not found")
