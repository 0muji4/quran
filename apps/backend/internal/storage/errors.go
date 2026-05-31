package storage

import "errors"

// ErrObjectNotFound is returned by ObjectStore.Get when no object exists at
// the requested key. Handlers should translate it into a 404 response.
var ErrObjectNotFound = errors.New("storage: object not found")
