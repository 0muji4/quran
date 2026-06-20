package scoring

import (
	"context"
	"encoding/json"
	"fmt"
	"time"

	"quran-project/apps/backend/internal/arabic"
	"quran-project/apps/backend/internal/domain"
	"quran-project/apps/backend/internal/repo"
)

// AyahLookup resolves the reference verse for a scoring request. It is the
// narrow slice of the surah service the job orchestration depends on, so the
// use case can be unit-tested without a database.
type AyahLookup interface {
	GetAyahByNumber(ctx context.Context, surahID, ayahNumber int32) (domain.Ayah, error)
}

// Evaluation is the typed, machine-readable scoring breakdown persisted with
// a job and returned to clients. It replaces the previous ad-hoc
// map[string]any so the wire shape is defined in exactly one place.
type Evaluation struct {
	Accuracy     float64            `json:"accuracy"`
	Fluency      float64            `json:"fluency"`
	Completeness float64            `json:"completeness"`
	WER          float64            `json:"wer"`
	Transcript   string             `json:"transcript"`
	Alignments   []arabic.Alignment `json:"alignments"`
}

// JobInput is a decoded, validated request to score one recitation. The
// transport layer is responsible for parsing and validating before calling
// Create; the use case assumes the fields are present.
type JobInput struct {
	SessionID  string
	UploadKey  string
	SurahID    int32
	AyahNumber int32
	UserID     string
}

// JobResult is the outcome of a successful scoring pass, ready for the
// transport layer to serialize.
type JobResult struct {
	SessionID  string
	UploadKey  string
	Score      float64
	Evaluation Evaluation
	CreatedAt  time.Time
}

// JobService orchestrates one scoring request end to end: resolve the verse,
// open the job row, run the Engine, and persist the result. It owns no
// transport concerns — the HTTP handler decodes the request, maps the
// sentinel errors that surface here (repo.ErrAyahNotFound,
// storage.ErrObjectNotFound, transcribe.ErrUnavailable) to status codes, and
// encodes the result.
type JobService struct {
	Ayahs  AyahLookup
	Jobs   repo.ScoringJobRepository
	Engine *Engine
}

// NewJobService constructs a JobService; all collaborators are required.
func NewJobService(ayahs AyahLookup, jobs repo.ScoringJobRepository, engine *Engine) *JobService {
	return &JobService{Ayahs: ayahs, Jobs: jobs, Engine: engine}
}

// Create scores one recitation: it resolves the reference ayah, opens the
// job in RUNNING state, runs the Engine, and persists the COMPLETED result.
// On any failure after the job is opened it best-effort marks the job FAILED
// and returns the underlying error unchanged so the handler can inspect it
// with errors.Is.
func (s *JobService) Create(ctx context.Context, in JobInput) (JobResult, error) {
	ayah, err := s.Ayahs.GetAyahByNumber(ctx, in.SurahID, in.AyahNumber)
	if err != nil {
		// repo.ErrAyahNotFound flows through unchanged for the handler.
		return JobResult{}, err
	}

	sessionID := in.SessionID
	if sessionID == "" {
		sessionID = in.UploadKey
	}

	createdAt, err := s.Jobs.Start(ctx, repo.StartScoringJobParams{
		SessionID:  sessionID,
		UserID:     in.UserID,
		UploadKey:  in.UploadKey,
		SurahID:    in.SurahID,
		AyahID:     ayah.ID,
		AyahNumber: in.AyahNumber,
	})
	if err != nil {
		return JobResult{}, fmt.Errorf("scoring: start job: %w", err)
	}

	result, err := s.Engine.Score(ctx, in.UploadKey, ayah.TextAr)
	if err != nil {
		s.markFailed(ctx, sessionID)
		// Return unchanged: callers inspect storage / transcribe sentinels.
		return JobResult{}, err
	}

	eval := Evaluation{
		Accuracy:     result.Score.Accuracy,
		Fluency:      result.Score.Fluency,
		Completeness: result.Score.Completeness,
		WER:          result.WER,
		Transcript:   result.Transcript,
		Alignments:   result.Alignments,
	}
	evalJSON, err := json.Marshal(eval)
	if err != nil {
		s.markFailed(ctx, sessionID)
		return JobResult{}, fmt.Errorf("scoring: encode evaluation: %w", err)
	}

	if err := s.Jobs.Complete(ctx, sessionID, result.Score.Overall, evalJSON); err != nil {
		return JobResult{}, fmt.Errorf("scoring: persist score: %w", err)
	}

	return JobResult{
		SessionID:  sessionID,
		UploadKey:  in.UploadKey,
		Score:      result.Score.Overall,
		Evaluation: eval,
		CreatedAt:  createdAt,
	}, nil
}

// Get returns the persisted job for the session, or
// repo.ErrScoringJobNotFound when none exists.
func (s *JobService) Get(ctx context.Context, sessionID string) (repo.ScoringJob, error) {
	return s.Jobs.Get(ctx, sessionID)
}

// markFailed swallows the repository error: the caller already holds the
// original failure and that is the one worth surfacing.
func (s *JobService) markFailed(ctx context.Context, sessionID string) {
	_ = s.Jobs.MarkFailed(ctx, sessionID)
}
