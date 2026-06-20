package scoring_test

import (
	"context"
	"encoding/json"
	"errors"
	"io"
	"testing"
	"time"

	"github.com/stretchr/testify/require"

	"quran-project/apps/backend/internal/domain"
	"quran-project/apps/backend/internal/repo"
	"quran-project/apps/backend/internal/scoring"
	"quran-project/apps/backend/internal/storage"
	"quran-project/apps/backend/internal/transcribe"
)

type fakeAyahLookup struct {
	fn func(ctx context.Context, surahID, ayahNumber int32) (domain.Ayah, error)
}

func (f fakeAyahLookup) GetAyahByNumber(ctx context.Context, surahID, ayahNumber int32) (domain.Ayah, error) {
	return f.fn(ctx, surahID, ayahNumber)
}

type fakeJobRepo struct {
	startFn    func(ctx context.Context, p repo.StartScoringJobParams) (time.Time, error)
	completeFn func(ctx context.Context, sessionID string, score float64, eval json.RawMessage) error
	failFn     func(ctx context.Context, sessionID string) error
	getFn      func(ctx context.Context, sessionID string) (repo.ScoringJob, error)

	failedSessions []string
	completed      bool
}

func (f *fakeJobRepo) Start(ctx context.Context, p repo.StartScoringJobParams) (time.Time, error) {
	return f.startFn(ctx, p)
}

func (f *fakeJobRepo) Complete(ctx context.Context, sessionID string, score float64, eval json.RawMessage) error {
	f.completed = true
	if f.completeFn != nil {
		return f.completeFn(ctx, sessionID, score, eval)
	}
	return nil
}

func (f *fakeJobRepo) MarkFailed(ctx context.Context, sessionID string) error {
	f.failedSessions = append(f.failedSessions, sessionID)
	if f.failFn != nil {
		return f.failFn(ctx, sessionID)
	}
	return nil
}

func (f *fakeJobRepo) Get(ctx context.Context, sessionID string) (repo.ScoringJob, error) {
	return f.getFn(ctx, sessionID)
}

func newEngine(t *testing.T, transcript string, words []transcribe.Word) *scoring.Engine {
	t.Helper()
	store := &fakeStore{getFn: staticAudio("opus")}
	tr := &fakeTranscriber{fn: func(_ context.Context, _ transcribe.Request) (transcribe.Result, error) {
		return transcribe.Result{Transcript: transcript, Words: words}, nil
	}}
	engine, err := scoring.NewEngine(store, tr)
	require.NoError(t, err)
	return engine
}

func TestJobServiceCreateHappyPath(t *testing.T) {
	createdAt := time.Date(2026, 6, 19, 12, 0, 0, 0, time.UTC)
	ayahLookup := fakeAyahLookup{fn: func(_ context.Context, surahID, ayahNumber int32) (domain.Ayah, error) {
		require.Equal(t, int32(1), surahID)
		require.Equal(t, int32(1), ayahNumber)
		return domain.Ayah{ID: 10, SurahID: 1, AyahNumber: 1, TextAr: "بسم الله"}, nil
	}}
	var startedParams repo.StartScoringJobParams
	jobs := &fakeJobRepo{
		startFn: func(_ context.Context, p repo.StartScoringJobParams) (time.Time, error) {
			startedParams = p
			return createdAt, nil
		},
	}
	engine := newEngine(t, "بسم الله", []transcribe.Word{{Text: "بسم", Confidence: 0.9}, {Text: "الله", Confidence: 0.8}})

	svc := scoring.NewJobService(ayahLookup, jobs, engine)
	res, err := svc.Create(context.Background(), scoring.JobInput{
		SessionID:  "sess-1",
		UploadKey:  "uploads/a.opus",
		SurahID:    1,
		AyahNumber: 1,
		UserID:     "user-1",
	})

	require.NoError(t, err)
	require.True(t, jobs.completed)
	require.Empty(t, jobs.failedSessions)
	require.Equal(t, "sess-1", res.SessionID)
	require.Equal(t, "uploads/a.opus", res.UploadKey)
	require.Equal(t, createdAt, res.CreatedAt)
	require.Equal(t, int64(10), startedParams.AyahID)
	require.Equal(t, "sess-1", startedParams.SessionID)
	require.Equal(t, float64(1), res.Evaluation.Accuracy)
}

func TestJobServiceCreateDefaultsSessionToUploadKey(t *testing.T) {
	ayahLookup := fakeAyahLookup{fn: func(_ context.Context, _, _ int32) (domain.Ayah, error) {
		return domain.Ayah{ID: 5, TextAr: "بسم الله"}, nil
	}}
	var startSession, completeSession string
	jobs := &fakeJobRepo{
		startFn: func(_ context.Context, p repo.StartScoringJobParams) (time.Time, error) {
			startSession = p.SessionID
			return time.Now(), nil
		},
		completeFn: func(_ context.Context, sessionID string, _ float64, _ json.RawMessage) error {
			completeSession = sessionID
			return nil
		},
	}
	engine := newEngine(t, "بسم الله", []transcribe.Word{{Text: "بسم", Confidence: 0.9}})

	svc := scoring.NewJobService(ayahLookup, jobs, engine)
	res, err := svc.Create(context.Background(), scoring.JobInput{
		UploadKey:  "uploads/b.opus",
		SurahID:    1,
		AyahNumber: 1,
	})

	require.NoError(t, err)
	require.Equal(t, "uploads/b.opus", res.SessionID)
	require.Equal(t, "uploads/b.opus", startSession)
	require.Equal(t, "uploads/b.opus", completeSession)
}

func TestJobServiceCreateAyahNotFound(t *testing.T) {
	ayahLookup := fakeAyahLookup{fn: func(_ context.Context, _, _ int32) (domain.Ayah, error) {
		return domain.Ayah{}, repo.ErrAyahNotFound
	}}
	jobs := &fakeJobRepo{startFn: func(_ context.Context, _ repo.StartScoringJobParams) (time.Time, error) {
		t.Fatal("Start should not be called when the ayah is missing")
		return time.Time{}, nil
	}}
	engine := newEngine(t, "x", nil)

	svc := scoring.NewJobService(ayahLookup, jobs, engine)
	_, err := svc.Create(context.Background(), scoring.JobInput{UploadKey: "k", SurahID: 1, AyahNumber: 99})

	require.ErrorIs(t, err, repo.ErrAyahNotFound)
	require.Empty(t, jobs.failedSessions)
}

func TestJobServiceCreateMarksFailedOnScoreError(t *testing.T) {
	ayahLookup := fakeAyahLookup{fn: func(_ context.Context, _, _ int32) (domain.Ayah, error) {
		return domain.Ayah{ID: 1, TextAr: "بسم الله"}, nil
	}}
	jobs := &fakeJobRepo{startFn: func(_ context.Context, _ repo.StartScoringJobParams) (time.Time, error) {
		return time.Now(), nil
	}}
	// Engine whose store reports the object is missing.
	store := &fakeStore{getFn: func(_ context.Context, _ string) (io.ReadCloser, error) {
		return nil, storage.ErrObjectNotFound
	}}
	engine, err := scoring.NewEngine(store, &fakeTranscriber{fn: func(_ context.Context, _ transcribe.Request) (transcribe.Result, error) {
		return transcribe.Result{}, nil
	}})
	require.NoError(t, err)

	svc := scoring.NewJobService(ayahLookup, jobs, engine)
	_, err = svc.Create(context.Background(), scoring.JobInput{SessionID: "sess-x", UploadKey: "k", SurahID: 1, AyahNumber: 1})

	require.ErrorIs(t, err, storage.ErrObjectNotFound)
	require.Equal(t, []string{"sess-x"}, jobs.failedSessions)
	require.False(t, jobs.completed)
}

func TestJobServiceCreateStartError(t *testing.T) {
	ayahLookup := fakeAyahLookup{fn: func(_ context.Context, _, _ int32) (domain.Ayah, error) {
		return domain.Ayah{ID: 1, TextAr: "بسم"}, nil
	}}
	startErr := errors.New("db down")
	jobs := &fakeJobRepo{startFn: func(_ context.Context, _ repo.StartScoringJobParams) (time.Time, error) {
		return time.Time{}, startErr
	}}
	engine := newEngine(t, "بسم", nil)

	svc := scoring.NewJobService(ayahLookup, jobs, engine)
	_, err := svc.Create(context.Background(), scoring.JobInput{UploadKey: "k", SurahID: 1, AyahNumber: 1})

	require.ErrorIs(t, err, startErr)
	require.Empty(t, jobs.failedSessions) // job never opened
}

func TestJobServiceGet(t *testing.T) {
	want := repo.ScoringJob{SessionID: "s", Status: "COMPLETED"}
	jobs := &fakeJobRepo{getFn: func(_ context.Context, sessionID string) (repo.ScoringJob, error) {
		require.Equal(t, "s", sessionID)
		return want, nil
	}}
	svc := scoring.NewJobService(fakeAyahLookup{}, jobs, &scoring.Engine{})

	got, err := svc.Get(context.Background(), "s")
	require.NoError(t, err)
	require.Equal(t, want, got)
}

// TestJobServiceCreateTimeoutMarksFailedOnDetachedContext verifies that a
// slow transcriber that runs past the JobService timeout (a) returns
// context.DeadlineExceeded and (b) still flips the row to FAILED — the
// cleanup write must use a context detached from the expired one so the
// scoring_jobs row does not orphan in RUNNING.
func TestJobServiceCreateTimeoutMarksFailedOnDetachedContext(t *testing.T) {
	ayahLookup := fakeAyahLookup{fn: func(_ context.Context, _, _ int32) (domain.Ayah, error) {
		return domain.Ayah{ID: 1, TextAr: "بسم"}, nil
	}}

	// Capture the context the repo sees for MarkFailed and confirm it
	// has its own deadline (i.e. it is not the expired request ctx).
	var markFailedCtxErr error
	var markFailedHasDeadline bool
	jobs := &fakeJobRepo{
		startFn: func(_ context.Context, _ repo.StartScoringJobParams) (time.Time, error) {
			return time.Now(), nil
		},
		failFn: func(ctx context.Context, _ string) error {
			markFailedCtxErr = ctx.Err()
			_, markFailedHasDeadline = ctx.Deadline()
			return nil
		},
	}

	// Transcriber blocks until the surrounding context is cancelled,
	// which the JobService's timeout will do almost immediately.
	store := &fakeStore{getFn: staticAudio("opus")}
	tr := &fakeTranscriber{fn: func(ctx context.Context, _ transcribe.Request) (transcribe.Result, error) {
		<-ctx.Done()
		return transcribe.Result{}, ctx.Err()
	}}
	engine, err := scoring.NewEngine(store, tr)
	require.NoError(t, err)

	svc := scoring.NewJobService(ayahLookup, jobs, engine)
	svc.Timeout = 20 * time.Millisecond

	_, err = svc.Create(context.Background(), scoring.JobInput{
		SessionID: "sess-timeout", UploadKey: "k", SurahID: 1, AyahNumber: 1,
	})

	require.ErrorIs(t, err, context.DeadlineExceeded)
	require.Equal(t, []string{"sess-timeout"}, jobs.failedSessions)
	// Cleanup ctx must NOT inherit the expired deadline — it has its own
	// fresh one — and must not already be in an error state.
	require.NoError(t, markFailedCtxErr, "MarkFailed received an already-cancelled context")
	require.True(t, markFailedHasDeadline, "MarkFailed context should carry its own deadline")
}

// TestJobServiceCreateDefaultsTimeout verifies the use case applies its
// default deadline when Timeout is left zero.
func TestJobServiceCreateDefaultsTimeout(t *testing.T) {
	ayahLookup := fakeAyahLookup{fn: func(_ context.Context, _, _ int32) (domain.Ayah, error) {
		return domain.Ayah{ID: 1, TextAr: "بسم"}, nil
	}}

	var sawDeadline bool
	jobs := &fakeJobRepo{
		startFn: func(ctx context.Context, _ repo.StartScoringJobParams) (time.Time, error) {
			_, sawDeadline = ctx.Deadline()
			return time.Now(), nil
		},
	}
	engine := newEngine(t, "بسم", []transcribe.Word{{Text: "بسم", Confidence: 0.9}})

	svc := scoring.NewJobService(ayahLookup, jobs, engine) // Timeout left zero
	_, err := svc.Create(context.Background(), scoring.JobInput{
		UploadKey: "k", SurahID: 1, AyahNumber: 1,
	})

	require.NoError(t, err)
	require.True(t, sawDeadline, "Create should impose a deadline even when Timeout is zero")
}
