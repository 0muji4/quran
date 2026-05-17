package repo

import (
	"context"
	"errors"

	"quran-project/apps/backend/internal/domain"
)

// MemoryRepository provides an in-memory implementation for testing.
type MemoryRepository struct {
	Surahs []domain.Surah
	Ayahs  []domain.Ayah
}

// ListSurahs returns all surahs stored in memory.
func (m *MemoryRepository) ListSurahs(_ context.Context) ([]domain.Surah, error) {
	return append([]domain.Surah{}, m.Surahs...), nil
}

// GetSurah returns a surah by ID.
func (m *MemoryRepository) GetSurah(_ context.Context, id int32) (domain.Surah, error) {
	for _, surah := range m.Surahs {
		if surah.ID == id {
			return surah, nil
		}
	}
	return domain.Surah{}, errors.New("surah not found")
}

// ListBySurah returns all ayahs for a given surah.
func (m *MemoryRepository) ListBySurah(_ context.Context, surahID int32) ([]domain.Ayah, error) {
	var results []domain.Ayah
	for _, ayah := range m.Ayahs {
		if ayah.SurahID == surahID {
			results = append(results, ayah)
		}
	}
	return results, nil
}

// GetAyah returns an ayah by ID.
func (m *MemoryRepository) GetAyah(_ context.Context, id int64) (domain.Ayah, error) {
	for _, ayah := range m.Ayahs {
		if ayah.ID == id {
			return ayah, nil
		}
	}
	return domain.Ayah{}, errors.New("ayah not found")
}

var (
	_ SurahRepository = (*MemoryRepository)(nil)
	_ AyahRepository  = (*MemoryRepository)(nil)
)
