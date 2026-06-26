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

// AyahLookup resolves the reference verse for a scoring request.
type AyahLookup interface {
	GetAyahByNumber(ctx context.Context, surahID, ayahNumber int32) (domain.Ayah, error)
}

// Evaluation is the scoring breakdown persisted with a job and returned to clients.
type Evaluation struct {
	Accuracy     float64            `json:"accuracy"`
	Fluency      float64            `json:"fluency"`
	Completeness float64            `json:"completeness"`
	WER          float64            `json:"wer"`
	CER          float64            `json:"cer"`
	Transcript   string             `json:"transcript"`
	Alignments   []arabic.Alignment `json:"alignments"`
}

// JobInput is a validated request to score one recitation.
type JobInput struct {
	SessionID         string
	UploadKey         string
	SurahID           int32
	AyahNumber        int32
	UserID            string
	ReferenceAudioKey string
}

// JobResult is the outcome of a successful scoring pass.
type JobResult struct {
	SessionID  string
	UploadKey  string
	Score      float64
	Evaluation Evaluation
	CreatedAt  time.Time
}

// DefaultJobTimeout caps a single scoring pipeline.
const DefaultJobTimeout = 30 * time.Second

const markFailedTimeout = 5 * time.Second

// JobService orchestrates one scoring request: resolve the verse, open the
// job, run the Engine, persist the result.
type JobService struct {
	Ayahs   AyahLookup
	Jobs    repo.ScoringJobRepository
	Engine  *Engine
	Timeout time.Duration
}

func NewJobService(ayahs AyahLookup, jobs repo.ScoringJobRepository, engine *Engine) *JobService {
	return &JobService{Ayahs: ayahs, Jobs: jobs, Engine: engine}
}

// Create scores one recitation and persists the result.
func (s *JobService) Create(ctx context.Context, in JobInput) (JobResult, error) {
	timeout := s.Timeout
	if timeout <= 0 {
		timeout = DefaultJobTimeout
	}
	ctx, cancel := context.WithTimeout(ctx, timeout)
	defer cancel()

	ayah, err := s.Ayahs.GetAyahByNumber(ctx, in.SurahID, in.AyahNumber)
	if err != nil {
		return JobResult{}, err
	}

	sessionID := in.SessionID
	if sessionID == "" {
		sessionID = in.UploadKey
	}

	createdAt, err := s.Jobs.Start(ctx, repo.StartScoringJobParams{
		SessionID:         sessionID,
		UserID:            in.UserID,
		UploadKey:         in.UploadKey,
		SurahID:           in.SurahID,
		AyahID:            ayah.ID,
		AyahNumber:        in.AyahNumber,
		ReferenceAudioKey: in.ReferenceAudioKey,
	})
	if err != nil {
		return JobResult{}, fmt.Errorf("scoring: start job: %w", err)
	}

	result, err := s.Engine.Score(ctx, in.UploadKey, ayah.TextAr)
	if err != nil {
		s.markFailed(ctx, sessionID)
		return JobResult{}, err
	}

	eval := Evaluation{
		Accuracy:     result.Score.Accuracy,
		Fluency:      result.Score.Fluency,
		Completeness: result.Score.Completeness,
		WER:          result.WER,
		CER:          result.CER,
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

// Get returns the persisted job, or domain.ErrScoringJobNotFound.
func (s *JobService) Get(ctx context.Context, sessionID string) (repo.ScoringJob, error) {
	return s.Jobs.Get(ctx, sessionID)
}

func (s *JobService) markFailed(ctx context.Context, sessionID string) {
	cleanup, cancel := context.WithTimeout(context.WithoutCancel(ctx), markFailedTimeout)
	defer cancel()
	_ = s.Jobs.MarkFailed(cleanup, sessionID)
}
