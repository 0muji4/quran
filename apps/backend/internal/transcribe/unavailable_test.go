package transcribe

import (
	"context"
	"errors"
	"testing"
)

func TestUnavailableTranscriber_ReturnsSentinel(t *testing.T) {
	t.Parallel()

	tr := NewUnavailableTranscriber()
	_, err := tr.Transcribe(context.Background(), Request{})

	if !errors.Is(err, ErrUnavailable) {
		t.Fatalf("expected errors.Is(err, ErrUnavailable) to be true, got %v", err)
	}
}

func TestUnavailableTranscriber_SatisfiesInterface(t *testing.T) {
	t.Parallel()

	// Compile-time guard: assigning to a typed nil ensures
	// UnavailableTranscriber implements Transcriber. Keeping it as a
	// runtime test makes the intent visible to readers.
	var _ Transcriber = NewUnavailableTranscriber()
}
