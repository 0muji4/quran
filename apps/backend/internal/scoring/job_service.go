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
	CER          float64            `json:"cer"`
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
	// ReferenceAudioKey is the teacher-recitation object key resolved by the
	// edge before scoring; persisted with the job so the result read path can
	// presign a playable reference URL.
	ReferenceAudioKey string
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

// DefaultJobTimeout caps how long a single scoring pipeline (transcribe +
// score + persist) may run when the caller does not impose a tighter
// deadline. Chirp 3 returns in 1–3 seconds in normal operation; the buffer
// here covers retries and network jitter while still bounding RUNNING rows
// so a hung transcriber cannot orphan them indefinitely.
const DefaultJobTimeout = 30 * time.Second

// markFailedTimeout bounds the best-effort cleanup write that flips an
// orphan RUNNING row to FAILED. It runs on a context detached from the
// (now expired or cancelled) request context, so it needs its own bound.
const markFailedTimeout = 5 * time.Second

// JobService orchestrates one scoring request end to end: resolve the verse,
// open the job row, run the Engine, and persist the result. It owns no
// transport concerns — the HTTP handler decodes the request, maps the
// sentinel errors that surface here (domain.ErrAyahNotFound,
// storage.ErrObjectNotFound, transcribe.ErrUnavailable) to status codes, and
// encodes the result.
type JobService struct {
	Ayahs  AyahLookup
	Jobs   repo.ScoringJobRepository
	Engine *Engine
	// Timeout caps a single Create call. If zero, DefaultJobTimeout is
	// applied. If the caller's context has an earlier deadline, that one
	// still wins (context.WithTimeout never extends a deadline).
	Timeout time.Duration
}

// NewJobService constructs a JobService; all collaborators are required.
// The per-call deadline defaults to DefaultJobTimeout; override by setting
// Timeout on the returned value.
func NewJobService(ayahs AyahLookup, jobs repo.ScoringJobRepository, engine *Engine) *JobService {
	return &JobService{Ayahs: ayahs, Jobs: jobs, Engine: engine}
}

// Create scores one recitation: it resolves the reference ayah, opens the
// job in RUNNING state, runs the Engine, and persists the COMPLETED result.
// On any failure after the job is opened it best-effort marks the job FAILED
// (on a detached context so the cleanup runs even when the caller's
// deadline has elapsed) and returns the underlying error unchanged so the
// handler can inspect it with errors.Is.
func (s *JobService) Create(ctx context.Context, in JobInput) (JobResult, error) {
	timeout := s.Timeout
	if timeout <= 0 {
		timeout = DefaultJobTimeout
	}
	ctx, cancel := context.WithTimeout(ctx, timeout)
	defer cancel()

	ayah, err := s.Ayahs.GetAyahByNumber(ctx, in.SurahID, in.AyahNumber)
	if err != nil {
		// domain.ErrAyahNotFound flows through unchanged for the handler.
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
		// Return unchanged: callers inspect storage / transcribe sentinels.
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

// Get returns the persisted job for the session, or
// domain.ErrScoringJobNotFound when none exists.
func (s *JobService) Get(ctx context.Context, sessionID string) (repo.ScoringJob, error) {
	return s.Jobs.Get(ctx, sessionID)
}

// markFailed best-effort flips the row to FAILED on a context detached
// from the (likely expired or cancelled) request context, so the cleanup
// write still lands and the row does not orphan in RUNNING. The repository
// error is swallowed: the caller already holds the original failure and
// that is the one worth surfacing.
func (s *JobService) markFailed(ctx context.Context, sessionID string) {
	cleanup, cancel := context.WithTimeout(context.WithoutCancel(ctx), markFailedTimeout)
	defer cancel()
	_ = s.Jobs.MarkFailed(cleanup, sessionID)
}
