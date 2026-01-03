package repo

import (
	"context"

	"quran-project/apps/backend/internal/domain"
)

// SurahRepository defines storage operations for surah metadata.
type SurahRepository interface {
	List(ctx context.Context) ([]domain.Surah, error)
	GetSurah(ctx context.Context, id int32) (domain.Surah, error)
}

// AyahRepository defines storage operations for verse-level data.
type AyahRepository interface {
	ListBySurah(ctx context.Context, surahID int32) ([]domain.Ayah, error)
	GetAyah(ctx context.Context, id int64) (domain.Ayah, error)
}
