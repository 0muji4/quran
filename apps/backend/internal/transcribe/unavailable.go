package transcribe

import (
	"context"
	"errors"
)

// ErrUnavailable signals that the backend started without a real
// transcriber (typically because `CHIRP_PROJECT` was unset, as in the
// dev `docker compose` stack or e2e CI). Handlers can check for this
// sentinel with `errors.Is` and respond with a clear 5xx instead of a
// generic "transcribe failed" mapping.
var ErrUnavailable = errors.New("transcribe: transcriber not configured")

// UnavailableTranscriber implements `Transcriber` by returning
// [ErrUnavailable] from every `Transcribe` call. It lets the backend
// process boot — and serve all non-scoring endpoints (`/surahs`,
// `/ayah/...`, `/healthz`, `/me/*`) — even when the Speech-to-Text
// configuration is intentionally absent.
//
// The trade-off is loud failure at request time rather than fatal
// failure at startup: dev compose + e2e exercise the catalog and
// auth surfaces freely, while any attempt to actually score a
// recording returns a structured error that points the operator at
// the missing config rather than crashing the entire backend.
type UnavailableTranscriber struct{}

// NewUnavailableTranscriber returns a `Transcriber` that always
// errors with [ErrUnavailable].
func NewUnavailableTranscriber() *UnavailableTranscriber {
	return &UnavailableTranscriber{}
}

// Transcribe satisfies [Transcriber] by returning [ErrUnavailable].
func (UnavailableTranscriber) Transcribe(_ context.Context, _ Request) (Result, error) {
	return Result{}, ErrUnavailable
}
