package repo

import (
	"context"
	"testing"

	"github.com/stretchr/testify/require"

	"quran-project/apps/backend/internal/domain"
)

func TestMemoryRepositorySurahs(t *testing.T) {
	repo := MemoryRepository{
		Surahs: []domain.Surah{{ID: 1, NameEN: "Al-Fatiha"}},
	}

	surahs, err := repo.ListSurahs(context.Background())
	require.NoError(t, err)
	require.Len(t, surahs, 1)
	require.Equal(t, int32(1), surahs[0].ID)

	surah, err := repo.GetSurah(context.Background(), 1)
	require.NoError(t, err)
	require.Equal(t, "Al-Fatiha", surah.NameEN)

	missingSurah, err := repo.GetSurah(context.Background(), 99)
	require.EqualError(t, err, "surah not found")
	require.Equal(t, domain.Surah{}, missingSurah)
}

func TestMemoryRepositoryAyahs(t *testing.T) {
	repo := MemoryRepository{
		Ayahs: []domain.Ayah{{ID: 11, SurahID: 2, AyahNumber: 1}},
	}

	ayahs, err := repo.ListBySurah(context.Background(), 2)
	require.NoError(t, err)
	require.Len(t, ayahs, 1)
	require.Equal(t, int64(11), ayahs[0].ID)

	ayah, err := repo.GetAyah(context.Background(), 11)
	require.NoError(t, err)
	require.Equal(t, int32(1), ayah.AyahNumber)

	missingAyah, err := repo.GetAyah(context.Background(), 99)
	require.EqualError(t, err, "ayah not found")
	require.Equal(t, domain.Ayah{}, missingAyah)

	emptyAyahs, err := repo.ListBySurah(context.Background(), 3)
	require.NoError(t, err)
	require.Empty(t, emptyAyahs)
	require.Nil(t, emptyAyahs)
}
