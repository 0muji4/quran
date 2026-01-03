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

// List returns all surahs stored in memory.
func (m MemoryRepository) List(ctx context.Context) ([]domain.Surah, error) {
	_ = ctx
	return append([]domain.Surah{}, m.Surahs...), nil
}

// GetSurah returns a surah by ID.
func (m MemoryRepository) GetSurah(ctx context.Context, id int32) (domain.Surah, error) {
	_ = ctx
	for _, surah := range m.Surahs {
		if surah.ID == id {
			return surah, nil
		}
	}
	return domain.Surah{}, errors.New("surah not found")
}

// ListBySurah returns all ayahs for a given surah.
func (m MemoryRepository) ListBySurah(ctx context.Context, surahID int32) ([]domain.Ayah, error) {
	_ = ctx
	var results []domain.Ayah
	for _, ayah := range m.Ayahs {
		if ayah.SurahID == surahID {
			results = append(results, ayah)
		}
	}
	return results, nil
}

// GetAyah returns an ayah by ID.
func (m MemoryRepository) GetAyah(ctx context.Context, id int64) (domain.Ayah, error) {
	_ = ctx
	for _, ayah := range m.Ayahs {
		if ayah.ID == id {
			return ayah, nil
		}
	}
	return domain.Ayah{}, errors.New("ayah not found")
}

var _ SurahRepository = MemoryRepository{}
var _ AyahRepository = MemoryRepository{}
