package repo

import (
	"context"
	"encoding/json"
	"errors"
	"time"

	"quran-project/apps/backend/internal/domain"
)

// ErrAyahNotFound is returned when a verse lookup matches no row. Callers
// (for example HTTP handlers) can map it to a 404 with errors.Is.
var ErrAyahNotFound = errors.New("ayah not found")

// ErrScoringJobNotFound is returned by ScoringJobRepository.Get when no row
// exists for the session, so callers can map it to a 404 without depending
// on database/sql sentinels leaking through the abstraction.
var ErrScoringJobNotFound = errors.New("scoring job not found")

// SurahRepository defines storage operations for surah metadata.
type SurahRepository interface {
	ListSurahs(ctx context.Context) ([]domain.Surah, error)
	GetSurah(ctx context.Context, id int32) (domain.Surah, error)
}

// AyahRepository defines storage operations for verse-level data.
type AyahRepository interface {
	ListBySurah(ctx context.Context, surahID int32) ([]domain.Ayah, error)
	GetAyah(ctx context.Context, id int64) (domain.Ayah, error)
	// GetByNumber resolves a verse by its (surahID, ayahNumber) pair so
	// callers do not have to list a whole surah to find one ayah. Returns
	// ErrAyahNotFound when no row matches.
	GetByNumber(ctx context.Context, surahID, ayahNumber int32) (domain.Ayah, error)
}

// StartScoringJobParams carries the fields needed to open (or refresh) a
// scoring job in the RUNNING state.
type StartScoringJobParams struct {
	SessionID  string
	UserID     string
	UploadKey  string
	SurahID    int32
	AyahID     int64
	AyahNumber int32
}

// ScoringJob is the persisted view of a scoring job returned by Get. The
// Segments and Evaluation columns are surfaced as raw JSON so the transport
// layer can re-emit them without an intermediate decode/encode round-trip.
type ScoringJob struct {
	SessionID  string
	UploadKey  string
	Status     string
	Score      *float64
	Verdict    *string
	Segments   json.RawMessage
	Evaluation json.RawMessage
	CreatedAt  time.Time
}

// ScoringJobRepository persists the lifecycle of recitation scoring jobs.
// Keeping these operations behind an interface means the HTTP handler never
// touches *sql.DB directly, mirroring how surah/ayah reads are abstracted.
type ScoringJobRepository interface {
	// Start upserts the job in RUNNING state and returns its created_at, so
	// a partial failure mid-pipeline still leaves a trace.
	Start(ctx context.Context, params StartScoringJobParams) (time.Time, error)
	// Complete flips the job to COMPLETED with the final score and the
	// pre-marshaled evaluation JSON.
	Complete(ctx context.Context, sessionID string, score float64, evaluation json.RawMessage) error
	// MarkFailed best-effort flips the job to FAILED. Returning the error
	// lets callers log it; they may also choose to ignore it so the
	// original failure is not masked.
	MarkFailed(ctx context.Context, sessionID string) error
	// Get returns the job for the session or ErrScoringJobNotFound.
	Get(ctx context.Context, sessionID string) (ScoringJob, error)
}
