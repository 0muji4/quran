// Package memory is an in-memory adapter for the repo ports, used in tests
// and adapter-free environments. It depends inward on repo and domain.
package memory

import (
	"context"
	"errors"

	"quran-project/apps/backend/internal/domain"
	"quran-project/apps/backend/internal/repo"
)

// Repository provides an in-memory implementation for testing.
type Repository struct {
	Surahs []domain.Surah
	Ayahs  []domain.Ayah
}

// ListSurahs returns all surahs stored in memory.
func (m *Repository) ListSurahs(_ context.Context) ([]domain.Surah, error) {
	return append([]domain.Surah{}, m.Surahs...), nil
}

// GetSurah returns a surah by ID.
func (m *Repository) GetSurah(_ context.Context, id int32) (domain.Surah, error) {
	for _, surah := range m.Surahs {
		if surah.ID == id {
			return surah, nil
		}
	}
	return domain.Surah{}, errors.New("surah not found")
}

// ListBySurah returns all ayahs for a given surah.
func (m *Repository) ListBySurah(_ context.Context, surahID int32) ([]domain.Ayah, error) {
	var results []domain.Ayah
	for _, ayah := range m.Ayahs {
		if ayah.SurahID == surahID {
			results = append(results, ayah)
		}
	}
	return results, nil
}

// GetAyah returns an ayah by ID.
func (m *Repository) GetAyah(_ context.Context, id int64) (domain.Ayah, error) {
	for _, ayah := range m.Ayahs {
		if ayah.ID == id {
			return ayah, nil
		}
	}
	return domain.Ayah{}, errors.New("ayah not found")
}

// GetByNumber returns an ayah by its (surahID, ayahNumber) pair.
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
