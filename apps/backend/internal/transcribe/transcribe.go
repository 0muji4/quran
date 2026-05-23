// Package transcribe defines the speech-to-text contract used by the Backend
// to convert a recitation recording into text and word-level timing data.
//
// Implementations wrap a specific provider (Google Cloud Speech, OpenAI
// Whisper API, etc.). The interface is intentionally narrow so that callers
// can be tested against fakes and providers can be swapped without touching
// alignment, scoring, or persistence code.
package transcribe

import (
	"context"
	"io"
	"time"
)

// Request is the input to a Transcriber. ExpectedText is an optional hint:
// implementations may use it to bias recognition toward those words (e.g.
// Google Speech phrase boost). Implementations that cannot use the hint must
// ignore it without error.
type Request struct {
	Audio        io.Reader
	ExpectedText string
}

// Result is the output of a successful transcription.
type Result struct {
	Transcript string
	Words      []Word
}

// Word is a single recognized token with timing and model confidence.
// Confidence is in [0, 1].
type Word struct {
	Text       string
	Start      time.Duration
	End        time.Duration
	Confidence float64
}

// Transcriber converts speech audio into text with word-level metadata.
type Transcriber interface {
	Transcribe(ctx context.Context, req Request) (Result, error)
}
