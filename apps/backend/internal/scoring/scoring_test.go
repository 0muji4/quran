package scoring_test

import (
	"context"
	"errors"
	"io"
	"strings"
	"testing"

	"github.com/stretchr/testify/require"

	"quran-project/apps/backend/internal/arabic"
	"quran-project/apps/backend/internal/scoring"
	"quran-project/apps/backend/internal/storage"
	"quran-project/apps/backend/internal/transcribe"
)

type fakeStore struct {
	getFn func(ctx context.Context, key string) (io.ReadCloser, error)
}

func (f *fakeStore) Get(ctx context.Context, key string) (io.ReadCloser, error) {
	return f.getFn(ctx, key)
}

type fakeTranscriber struct {
	fn func(ctx context.Context, req transcribe.Request) (transcribe.Result, error)
}

func (f *fakeTranscriber) Transcribe(ctx context.Context, req transcribe.Request) (transcribe.Result, error) {
	return f.fn(ctx, req)
}

func staticAudio(body string) func(ctx context.Context, key string) (io.ReadCloser, error) {
	return func(_ context.Context, _ string) (io.ReadCloser, error) {
		return io.NopCloser(strings.NewReader(body)), nil
	}
}

func TestNewEngineRejectsNilDeps(t *testing.T) {
	if _, err := scoring.NewEngine(nil, &fakeTranscriber{}); err == nil {
		t.Fatal("expected error when store is nil")
	}
	if _, err := scoring.NewEngine(&fakeStore{}, nil); err == nil {
		t.Fatal("expected error when transcriber is nil")
	}
}

func TestScoreHappyPath(t *testing.T) {
	store := &fakeStore{getFn: staticAudio("opus-bytes")}
	tr := &fakeTranscriber{fn: func(_ context.Context, _ transcribe.Request) (transcribe.Result, error) {
		return transcribe.Result{
			Transcript: "بسم الله الرحمن الرحيم",
			Words: []transcribe.Word{
				{Text: "بسم", Confidence: 0.95},
				{Text: "الله", Confidence: 0.92},
				{Text: "الرحمن", Confidence: 0.90},
				{Text: "الرحيم", Confidence: 0.88},
			},
		}, nil
	}}
	engine, err := scoring.NewEngine(store, tr)
	require.NoError(t, err)

	res, err := engine.Score(context.Background(), "uploads/x.opus", "بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ")
	require.NoError(t, err)
	require.Equal(t, "بسم الله الرحمن الرحيم", res.Transcript)
	require.Equal(t, float64(0), res.WER)
	require.Equal(t, float64(1), res.Score.Accuracy) // 1 - 0
	require.InDelta(t, (0.95+0.92+0.90+0.88)/4.0, res.Score.Fluency, 1e-9)
	require.Equal(t, float64(1), res.Score.Completeness)
	require.Len(t, res.Alignments, 4)
	for _, a := range res.Alignments {
		require.Equal(t, arabic.OpMatch, a.Op)
	}
}

func TestScorePassesExpectedTextAsHint(t *testing.T) {
	const expected = "بسم الله"
	var gotHint string
	store := &fakeStore{getFn: staticAudio("opus")}
	tr := &fakeTranscriber{fn: func(_ context.Context, req transcribe.Request) (transcribe.Result, error) {
		gotHint = req.ExpectedText
		return transcribe.Result{Transcript: expected}, nil
	}}
	engine, _ := scoring.NewEngine(store, tr)
	_, err := engine.Score(context.Background(), "k", expected)
	require.NoError(t, err)
	require.Equal(t, expected, gotHint)
}

func TestScorePropagatesObjectNotFound(t *testing.T) {
	store := &fakeStore{getFn: func(_ context.Context, _ string) (io.ReadCloser, error) {
		return nil, storage.ErrObjectNotFound
	}}
	engine, _ := scoring.NewEngine(store, &fakeTranscriber{})
	_, err := engine.Score(context.Background(), "missing", "ref")
	require.Error(t, err)
	require.ErrorIs(t, err, storage.ErrObjectNotFound)
}

func TestScorePropagatesTranscribeError(t *testing.T) {
	wantErr := errors.New("chirp boom")
	store := &fakeStore{getFn: staticAudio("opus")}
	tr := &fakeTranscriber{fn: func(_ context.Context, _ transcribe.Request) (transcribe.Result, error) {
		return transcribe.Result{}, wantErr
	}}
	engine, _ := scoring.NewEngine(store, tr)
	_, err := engine.Score(context.Background(), "k", "ref")
	require.Error(t, err)
	require.ErrorIs(t, err, wantErr)
}

func TestScoreSkipsZeroConfidenceWords(t *testing.T) {
	store := &fakeStore{getFn: staticAudio("opus")}
	tr := &fakeTranscriber{fn: func(_ context.Context, _ transcribe.Request) (transcribe.Result, error) {
		return transcribe.Result{
			Transcript: "a b",
			Words: []transcribe.Word{
				{Text: "a", Confidence: 0.8},
				{Text: "b", Confidence: 0}, // missing-confidence sentinel
			},
		}, nil
	}}
	engine, _ := scoring.NewEngine(store, tr)
	res, err := engine.Score(context.Background(), "k", "a b")
	require.NoError(t, err)
	// Fluency is the mean of the *non-zero* confidences only.
	require.InDelta(t, 0.8, res.Score.Fluency, 1e-9)
}
