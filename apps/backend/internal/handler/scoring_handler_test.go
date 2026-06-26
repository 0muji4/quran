package handler

import (
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"

	"github.com/stretchr/testify/require"

	"quran-project/apps/backend/internal/domain"
	"quran-project/apps/backend/internal/repo"
	"quran-project/apps/backend/internal/scoring"
)

// fakeScoringRepo is a hand-rolled repo.ScoringJobRepository whose behaviour
// each test sets per-method, so the scoring handlers can be exercised without
// a database or the ASR engine.
type fakeScoringRepo struct {
	startFn    func(ctx context.Context, p repo.StartScoringJobParams) (time.Time, error)
	completeFn func(ctx context.Context, sessionID string, score float64, evaluation json.RawMessage) error
	markFn     func(ctx context.Context, sessionID string) error
	getFn      func(ctx context.Context, sessionID string) (repo.ScoringJob, error)
}

func (f fakeScoringRepo) Start(ctx context.Context, p repo.StartScoringJobParams) (time.Time, error) {
	return f.startFn(ctx, p)
}

func (f fakeScoringRepo) Complete(ctx context.Context, sessionID string, score float64, evaluation json.RawMessage) error {
	return f.completeFn(ctx, sessionID, score, evaluation)
}

func (f fakeScoringRepo) MarkFailed(ctx context.Context, sessionID string) error {
	return f.markFn(ctx, sessionID)
}

func (f fakeScoringRepo) Get(ctx context.Context, sessionID string) (repo.ScoringJob, error) {
	return f.getFn(ctx, sessionID)
}

// fakeAyahLookup satisfies scoring.AyahLookup so create-path error mapping can
// be tested: a lookup failure short-circuits Create before the ASR engine.
type fakeAyahLookup struct {
	fn func(ctx context.Context, surahID, ayahNumber int32) (domain.Ayah, error)
}

func (f fakeAyahLookup) GetAyahByNumber(ctx context.Context, surahID, ayahNumber int32) (domain.Ayah, error) {
	return f.fn(ctx, surahID, ayahNumber)
}

// serveScoring routes one request through a freshly-registered mux against a
// REST handler wired with the given (possibly nil) JobService.
func serveScoring(t *testing.T, jobs *scoring.JobService, method, path, body string) *httptest.ResponseRecorder {
	t.Helper()
	mux := http.NewServeMux()
	REST{Jobs: jobs}.Register(mux)
	var req *http.Request
	if body == "" {
		req = httptest.NewRequest(method, path, nil)
	} else {
		req = httptest.NewRequest(method, path, strings.NewReader(body))
	}
	recorder := httptest.NewRecorder()
	mux.ServeHTTP(recorder, req)
	return recorder
}

func TestRESTScoringJobsNotConfigured(t *testing.T) {
	t.Run("create returns 500 when scoring is not wired", func(t *testing.T) {
		recorder := serveScoring(t, nil, http.MethodPost, "/api/scoring-jobs", `{}`)
		require.Equal(t, http.StatusInternalServerError, recorder.Code)
	})

	t.Run("get returns 500 when scoring is not wired", func(t *testing.T) {
		recorder := serveScoring(t, nil, http.MethodGet, "/api/scoring-jobs/sess-1", "")
		require.Equal(t, http.StatusInternalServerError, recorder.Code)
	})
}

func TestRESTHandleGetScoringJob(t *testing.T) {
	score := 0.88
	eval := json.RawMessage(`{"accuracy":0.9,"fluency":0.8,"completeness":0.95,"wer":0.1,"transcript":"x"}`)
	jobs := scoring.NewJobService(fakeAyahLookup{}, fakeScoringRepo{
		getFn: func(_ context.Context, sessionID string) (repo.ScoringJob, error) {
			return repo.ScoringJob{
				SessionID:  sessionID,
				UploadKey:  "uploads/rec.opus",
				Status:     "COMPLETED",
				Score:      &score,
				Evaluation: eval,
				CreatedAt:  time.Unix(0, 0).UTC(),
			}, nil
		},
	}, nil)

	recorder := serveScoring(t, jobs, http.MethodGet, "/api/scoring-jobs/sess-1", "")

	require.Equal(t, http.StatusOK, recorder.Code)

	var body scoringJobResponse
	require.NoError(t, json.NewDecoder(recorder.Body).Decode(&body))
	require.Equal(t, "sess-1", body.JobID)
	require.Equal(t, "COMPLETED", body.Status)
	require.NotNil(t, body.Score)
	require.InDelta(t, 0.88, *body.Score, 1e-9)
	require.JSONEq(t, string(eval), string(body.Evaluation))
	// Empty segments column surfaces as a JSON array, never null.
	require.JSONEq(t, "[]", string(body.Segments))
}

func TestRESTHandleGetScoringJobNotFound(t *testing.T) {
	jobs := scoring.NewJobService(fakeAyahLookup{}, fakeScoringRepo{
		getFn: func(_ context.Context, _ string) (repo.ScoringJob, error) {
			return repo.ScoringJob{}, domain.ErrScoringJobNotFound
		},
	}, nil)

	recorder := serveScoring(t, jobs, http.MethodGet, "/api/scoring-jobs/missing", "")

	require.Equal(t, http.StatusNotFound, recorder.Code)
}

func TestRESTHandleCreateScoringJobValidation(t *testing.T) {
	jobs := scoring.NewJobService(fakeAyahLookup{}, fakeScoringRepo{}, nil)

	tests := []struct {
		name string
		body string
	}{
		{name: "empty body", body: `{}`},
		{name: "missing ayahNumber", body: `{"uploadKey":"u","surahId":"1"}`},
		{name: "missing uploadKey", body: `{"surahId":"1","ayahNumber":1}`},
	}

	for _, test := range tests {
		t.Run(test.name, func(t *testing.T) {
			recorder := serveScoring(t, jobs, http.MethodPost, "/api/scoring-jobs", test.body)
			require.Equal(t, http.StatusBadRequest, recorder.Code)
		})
	}
}

func TestRESTHandleCreateScoringJobAyahNotFound(t *testing.T) {
	// The ayah lookup runs before the ASR engine, so an ErrAyahNotFound there
	// lets us assert the handler's 404 mapping with a nil Engine.
	jobs := scoring.NewJobService(fakeAyahLookup{
		fn: func(_ context.Context, _, _ int32) (domain.Ayah, error) {
			return domain.Ayah{}, domain.ErrAyahNotFound
		},
	}, fakeScoringRepo{}, nil)

	body := `{"uploadKey":"uploads/rec.opus","surahId":"1","ayahNumber":1}`
	recorder := serveScoring(t, jobs, http.MethodPost, "/api/scoring-jobs", body)

	require.Equal(t, http.StatusNotFound, recorder.Code)
	require.Equal(t, "ayah not found\n", recorder.Body.String())
}

var _ repo.ScoringJobRepository = fakeScoringRepo{}
var _ scoring.AyahLookup = fakeAyahLookup{}
