package service

import (
	"context"

	"quran-project/apps/backend/internal/domain"
	"quran-project/apps/backend/internal/repo"
)

// SurahService orchestrates surah and ayah retrieval.
type SurahService struct {
	SurahRepo repo.SurahRepository
	AyahRepo  repo.AyahRepository
}

// ListSurahs returns all available surahs.
func (s SurahService) ListSurahs(ctx context.Context) ([]domain.Surah, error) {
	return s.SurahRepo.List(ctx)
}

// GetSurah fetches a single surah.
func (s SurahService) GetSurah(ctx context.Context, id int32) (domain.Surah, error) {
	return s.SurahRepo.GetSurah(ctx, id)
}

// ListAyahs returns ayahs for a surah.
func (s SurahService) ListAyahs(ctx context.Context, surahID int32) ([]domain.Ayah, error) {
	return s.AyahRepo.ListBySurah(ctx, surahID)
}

// GetAyah fetches a single ayah by id.
func (s SurahService) GetAyah(ctx context.Context, id int64) (domain.Ayah, error) {
	return s.AyahRepo.GetAyah(ctx, id)
}
