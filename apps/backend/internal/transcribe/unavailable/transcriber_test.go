package unavailable_test

import (
	"context"
	"errors"
	"testing"

	"quran-project/apps/backend/internal/transcribe"
	"quran-project/apps/backend/internal/transcribe/unavailable"
)

func TestTranscriber_ReturnsSentinel(t *testing.T) {
	t.Parallel()

	tr := unavailable.NewTranscriber()
	_, err := tr.Transcribe(context.Background(), transcribe.Request{})

	if !errors.Is(err, transcribe.ErrUnavailable) {
		t.Fatalf("expected errors.Is(err, transcribe.ErrUnavailable) to be true, got %v", err)
	}
}

func TestTranscriber_SatisfiesInterface(t *testing.T) {
	t.Parallel()

	var _ transcribe.Transcriber = unavailable.NewTranscriber()
}
