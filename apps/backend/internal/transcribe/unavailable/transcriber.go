// Package unavailable is a null transcriber for when no Speech-to-Text
// backend is configured, letting the process boot and serve other endpoints.
package unavailable

import (
	"context"

	"quran-project/apps/backend/internal/transcribe"
)

// Transcriber returns transcribe.ErrUnavailable from every call.
type Transcriber struct{}

func NewTranscriber() *Transcriber {
	return &Transcriber{}
}

func (Transcriber) Transcribe(_ context.Context, _ transcribe.Request) (transcribe.Result, error) {
	return transcribe.Result{}, transcribe.ErrUnavailable
}
