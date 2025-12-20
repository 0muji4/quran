package repo

import (
	"context"
	"errors"

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

// InMemoryRepository is a lightweight repository for bootstrapping handlers before a database is ready.
type InMemoryRepository struct {
	surahs []domain.Surah
	ayahs  []domain.Ayah
}

// NewInMemoryRepository seeds a small data set for exploration.
func NewInMemoryRepository() *InMemoryRepository {
	return &InMemoryRepository{
		surahs: []domain.Surah{
			{ID: 1, NameAR: "الفاتحة", NameEN: "Al-Fatihah", RevelationPlace: "Mecca", AyahCount: 7},
			{ID: 2, NameAR: "البقرة", NameEN: "Al-Baqarah", RevelationPlace: "Medina", AyahCount: 286},
		},
		ayahs: []domain.Ayah{
			{ID: 1, SurahID: 1, AyahNumber: 1, TextAR: "بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ"},
			{ID: 2, SurahID: 1, AyahNumber: 2, TextAR: "الْحَمْدُ لِلَّهِ رَبِّ الْعَالَمِينَ"},
		},
	}
}

// List returns the seeded surahs.
func (r *InMemoryRepository) List(ctx context.Context) ([]domain.Surah, error) {
	return r.surahs, nil
}

// GetSurah returns a surah by ID if present.
func (r *InMemoryRepository) GetSurah(ctx context.Context, id int32) (domain.Surah, error) {
	for _, s := range r.surahs {
		if s.ID == id {
			return s, nil
		}
	}
	return domain.Surah{}, errors.New("surah not found")
}

// ListBySurah returns ayahs for a given surah.
func (r *InMemoryRepository) ListBySurah(ctx context.Context, surahID int32) ([]domain.Ayah, error) {
	var results []domain.Ayah
	for _, a := range r.ayahs {
		if a.SurahID == surahID {
			results = append(results, a)
		}
	}
	return results, nil
}

// GetAyah returns a single ayah by ID.
func (r *InMemoryRepository) GetAyah(ctx context.Context, id int64) (domain.Ayah, error) {
	for _, a := range r.ayahs {
		if a.ID == id {
			return a, nil
		}
	}
	return domain.Ayah{}, errors.New("ayah not found")
}
