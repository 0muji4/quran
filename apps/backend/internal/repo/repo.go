// Package repo defines the persistence ports; adapters live in subpackages.
package repo

import (
	"context"
	"encoding/json"
	"time"

	"quran-project/apps/backend/internal/domain"
)

// SurahRepository reads surah metadata.
type SurahRepository interface {
	ListSurahs(ctx context.Context) ([]domain.Surah, error)
	GetSurah(ctx context.Context, id int32) (domain.Surah, error)
}

// AyahRepository reads verse-level data.
type AyahRepository interface {
	ListBySurah(ctx context.Context, surahID int32) ([]domain.Ayah, error)
	GetAyah(ctx context.Context, id int64) (domain.Ayah, error)
	// GetByNumber returns the verse or domain.ErrAyahNotFound.
	GetByNumber(ctx context.Context, surahID, ayahNumber int32) (domain.Ayah, error)
}

// StartScoringJobParams are the fields to open or refresh a RUNNING scoring job.
type StartScoringJobParams struct {
	SessionID         string
	UserID            string
	UploadKey         string
	SurahID           int32
	AyahID            int64
	AyahNumber        int32
	ReferenceAudioKey string
}

// ScoringJob is the persisted view of a scoring job. Segments and Evaluation
// are raw JSON columns.
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
type ScoringJobRepository interface {
	// Start upserts the job in RUNNING state and returns its created_at.
	Start(ctx context.Context, params StartScoringJobParams) (time.Time, error)
	// Complete marks the job COMPLETED with the score and evaluation JSON.
	Complete(ctx context.Context, sessionID string, score float64, evaluation json.RawMessage) error
	// MarkFailed marks the job FAILED.
	MarkFailed(ctx context.Context, sessionID string) error
	// Get returns the job or domain.ErrScoringJobNotFound.
	Get(ctx context.Context, sessionID string) (ScoringJob, error)
}
