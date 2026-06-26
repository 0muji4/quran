package service

import (
	"context"

	"quran-project/apps/backend/internal/domain"
	"quran-project/apps/backend/internal/repo"
)

// SurahService reads surahs and ayahs.
type SurahService struct {
	SurahRepo repo.SurahRepository
	AyahRepo  repo.AyahRepository
}

func (s SurahService) ListSurahs(ctx context.Context) ([]domain.Surah, error) {
	return s.SurahRepo.ListSurahs(ctx)
}

func (s SurahService) GetSurah(ctx context.Context, id int32) (domain.Surah, error) {
	return s.SurahRepo.GetSurah(ctx, id)
}

func (s SurahService) ListAyahs(ctx context.Context, surahID int32) ([]domain.Ayah, error) {
	return s.AyahRepo.ListBySurah(ctx, surahID)
}

func (s SurahService) GetAyah(ctx context.Context, id int64) (domain.Ayah, error) {
	return s.AyahRepo.GetAyah(ctx, id)
}

func (s SurahService) GetAyahByNumber(ctx context.Context, surahID, ayahNumber int32) (domain.Ayah, error) {
	return s.AyahRepo.GetByNumber(ctx, surahID, ayahNumber)
}
