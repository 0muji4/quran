// Package transcribe defines the speech-to-text port.
package transcribe

import (
	"context"
	"errors"
	"io"
	"time"
)

// Request is the input to a Transcriber.
type Request struct {
	Audio        io.Reader
	ExpectedText string
}

// Result is the output of a transcription.
type Result struct {
	Transcript string
	Words      []Word
}

// Word is a recognized token with timing and confidence in [0,1].
type Word struct {
	Text       string
	Start      time.Duration
	End        time.Duration
	Confidence float64
}

// Transcriber converts speech audio into text.
type Transcriber interface {
	Transcribe(ctx context.Context, req Request) (Result, error)
}

// ErrUnavailable reports that no transcriber is configured.
var ErrUnavailable = errors.New("transcribe: transcriber not configured")
