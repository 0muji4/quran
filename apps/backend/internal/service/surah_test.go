package service

import (
	"context"
	"testing"

	"github.com/stretchr/testify/require"

	"quran-project/apps/backend/internal/domain"
)

type stubSurahRepo struct {
	surah domain.Surah
}

func (s stubSurahRepo) List(ctx context.Context) ([]domain.Surah, error) {
	return []domain.Surah{s.surah}, nil
}

func (s stubSurahRepo) GetSurah(ctx context.Context, id int32) (domain.Surah, error) {
	return domain.Surah{ID: id, NameEN: s.surah.NameEN}, nil
}

type stubAyahRepo struct {
	ayah domain.Ayah
}

func (s stubAyahRepo) ListBySurah(ctx context.Context, surahID int32) ([]domain.Ayah, error) {
	return []domain.Ayah{{SurahID: surahID, AyahNumber: s.ayah.AyahNumber}}, nil
}

func (s stubAyahRepo) GetAyah(ctx context.Context, id int64) (domain.Ayah, error) {
	return domain.Ayah{ID: id, TextAR: s.ayah.TextAR}, nil
}

func TestSurahService(t *testing.T) {
	svc := SurahService{
		SurahRepo: stubSurahRepo{surah: domain.Surah{NameEN: "Al-Fatiha"}},
		AyahRepo:  stubAyahRepo{ayah: domain.Ayah{AyahNumber: 1, TextAR: "بسم"}},
	}

	surahs, err := svc.ListSurahs(context.Background())
	require.NoError(t, err)
	require.Len(t, surahs, 1)
	require.Equal(t, "Al-Fatiha", surahs[0].NameEN)

	ayah, err := svc.GetAyah(context.Background(), 42)
	require.NoError(t, err)
	require.Equal(t, int64(42), ayah.ID)
	require.Equal(t, "بسم", ayah.TextAR)
}
