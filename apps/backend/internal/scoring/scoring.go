// Package scoring composes storage, transcription, and Arabic scoring into a
// single "score one recitation" operation.
package scoring

import (
	"context"
	"errors"
	"fmt"

	"quran-project/apps/backend/internal/arabic"
	"quran-project/apps/backend/internal/storage"
	"quran-project/apps/backend/internal/transcribe"
)

// Result is the per-recitation scoring output.
type Result struct {
	Transcript string
	Alignments []arabic.Alignment
	WER        float64
	CER        float64
	Score      arabic.PronunciationScore
}

// Engine scores one recitation.
type Engine struct {
	store       storage.ObjectStore
	transcriber transcribe.Transcriber
}

// NewEngine constructs an Engine; store and transcriber are required.
func NewEngine(store storage.ObjectStore, transcriber transcribe.Transcriber) (*Engine, error) {
	if store == nil {
		return nil, errors.New("scoring: store is required")
	}
	if transcriber == nil {
		return nil, errors.New("scoring: transcriber is required")
	}
	return &Engine{store: store, transcriber: transcriber}, nil
}

// Score fetches the audio at audioKey, transcribes it, and scores it against expectedText.
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
	cer := arabic.CER(expectedText, tr.Transcript)
	score := arabic.ScorePronunciation(alignments, wordConfidences(tr.Words), &wer)

	return Result{
		Transcript: tr.Transcript,
		Alignments: alignments,
		WER:        wer,
		CER:        cer,
		Score:      score,
	}, nil
}

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
