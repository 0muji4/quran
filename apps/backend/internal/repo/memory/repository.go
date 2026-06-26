// Package memory is an in-memory adapter for the repo ports, used in tests.
package memory

import (
	"context"
	"errors"

	"quran-project/apps/backend/internal/domain"
	"quran-project/apps/backend/internal/repo"
)

// Repository is an in-memory implementation of the repo.* ports.
type Repository struct {
	Surahs []domain.Surah
	Ayahs  []domain.Ayah
}

func (m *Repository) ListSurahs(_ context.Context) ([]domain.Surah, error) {
	return append([]domain.Surah{}, m.Surahs...), nil
}

func (m *Repository) GetSurah(_ context.Context, id int32) (domain.Surah, error) {
	for _, surah := range m.Surahs {
		if surah.ID == id {
			return surah, nil
		}
	}
	return domain.Surah{}, errors.New("surah not found")
}

func (m *Repository) ListBySurah(_ context.Context, surahID int32) ([]domain.Ayah, error) {
	var results []domain.Ayah
	for _, ayah := range m.Ayahs {
		if ayah.SurahID == surahID {
			results = append(results, ayah)
		}
	}
	return results, nil
}

func (m *Repository) GetAyah(_ context.Context, id int64) (domain.Ayah, error) {
	for _, ayah := range m.Ayahs {
		if ayah.ID == id {
			return ayah, nil
		}
	}
	return domain.Ayah{}, errors.New("ayah not found")
}

func (m *Repository) GetByNumber(_ context.Context, surahID, ayahNumber int32) (domain.Ayah, error) {
	for _, ayah := range m.Ayahs {
		if ayah.SurahID == surahID && ayah.AyahNumber == ayahNumber {
			return ayah, nil
		}
	}
	return domain.Ayah{}, domain.ErrAyahNotFound
}

var (
	_ repo.SurahRepository = (*Repository)(nil)
	_ repo.AyahRepository  = (*Repository)(nil)
)
