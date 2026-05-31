// Package scoring composes the storage, transcription, and Arabic scoring
// primitives into a single "score one recitation" operation.
//
// The package owns no transport concerns: callers (HTTP handlers, batch
// jobs, tests) construct an Engine with concrete or fake collaborators and
// invoke Score directly. This keeps the HTTP layer thin and lets the core
// be unit-tested without spinning up a database or an external transcriber.
package scoring

import (
	"context"
	"errors"
	"fmt"

	"quran-project/apps/backend/internal/arabic"
	"quran-project/apps/backend/internal/storage"
	"quran-project/apps/backend/internal/transcribe"
)

// Result is the full per-recitation output: the raw transcript, the
// alignment against the expected text, the word error rate, and the
// pronunciation score breakdown.
type Result struct {
	Transcript string
	Alignments []arabic.Alignment
	WER        float64
	Score      arabic.PronunciationScore
}

// Engine orchestrates one recitation scoring pass: fetch audio → transcribe
// → align → aggregate. Both collaborators are required; New rejects a nil.
type Engine struct {
	store       storage.ObjectStore
	transcriber transcribe.Transcriber
}

// NewEngine constructs an Engine; both store and transcriber are required.
func NewEngine(store storage.ObjectStore, transcriber transcribe.Transcriber) (*Engine, error) {
	if store == nil {
		return nil, errors.New("scoring: store is required")
	}
	if transcriber == nil {
		return nil, errors.New("scoring: transcriber is required")
	}
	return &Engine{store: store, transcriber: transcriber}, nil
}

// Score fetches the audio at audioKey, transcribes it (with expectedText
// passed through as a phrase hint), and computes the alignment + score
// against expectedText. The expectedText is the reference Arabic text for
// the target ayah.
//
// Errors:
//   - storage.ErrObjectNotFound when the upload key is unknown — handlers
//     should map this to a 404.
//   - Any transcription error is wrapped and returned unchanged in kind;
//     callers can inspect with errors.Is/As against transcribe's sentinels.
func (e *Engine) Score(ctx context.Context, audioKey, expectedText string) (Result, error) {
	audio, err := e.store.Get(ctx, audioKey)
	if err != nil {
		return Result{}, fmt.Errorf("scoring: fetch audio: %w", err)
	}
	defer audio.Close()

	tr, err := e.transcriber.Transcribe(ctx, transcribe.Request{
		Audio:        audio,
		ExpectedText: expectedText,
	})
	if err != nil {
		return Result{}, fmt.Errorf("scoring: transcribe: %w", err)
	}

	alignments := arabic.Align(expectedText, tr.Transcript)
	wer := arabic.WER(expectedText, tr.Transcript)
	score := arabic.ScorePronunciation(alignments, wordConfidences(tr.Words), &wer)

	return Result{
		Transcript: tr.Transcript,
		Alignments: alignments,
		WER:        wer,
		Score:      score,
	}, nil
}

// wordConfidences projects the per-word confidence values used for the
// fluency calculation. Words whose Confidence is exactly zero are treated
// as "no probability reported" and excluded — Whisper-style transcribers
// often omit confidence, and ScorePronunciation treats an empty slice as
// fluency=0 rather than averaging zeros into the score.
func wordConfidences(words []transcribe.Word) []float64 {
	if len(words) == 0 {
		return nil
	}
	out := make([]float64, 0, len(words))
	for _, w := range words {
		if w.Confidence == 0 {
			continue
		}
		out = append(out, w.Confidence)
	}
	return out
}
