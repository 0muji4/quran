package service

import (
	"context"
	"errors"
	"testing"

	"github.com/stretchr/testify/require"

	"quran-project/apps/backend/internal/domain"
)

type stubSurahRepo struct {
	surah domain.Surah
	err   error
}

func (s stubSurahRepo) ListSurahs(ctx context.Context) ([]domain.Surah, error) {
	if s.err != nil {
		return nil, s.err
	}
	return []domain.Surah{s.surah}, nil
}

func (s stubSurahRepo) GetSurah(ctx context.Context, id int32) (domain.Surah, error) {
	return domain.Surah{ID: id, NameEn: s.surah.NameEn}, nil
}

type stubAyahRepo struct {
	ayah domain.Ayah
	err  error
}

func (s stubAyahRepo) ListBySurah(ctx context.Context, surahID int32) ([]domain.Ayah, error) {
	return []domain.Ayah{{SurahID: surahID, AyahNumber: s.ayah.AyahNumber}}, nil
}

func (s stubAyahRepo) GetAyah(ctx context.Context, id int64) (domain.Ayah, error) {
	if s.err != nil {
		return domain.Ayah{}, s.err
	}
	return domain.Ayah{ID: id, TextAr: s.ayah.TextAr}, nil
}

func (s stubAyahRepo) GetByNumber(ctx context.Context, surahID, ayahNumber int32) (domain.Ayah, error) {
	if s.err != nil {
		return domain.Ayah{}, s.err
	}
	return domain.Ayah{SurahID: surahID, AyahNumber: ayahNumber, TextAr: s.ayah.TextAr}, nil
}

func TestSurahService(t *testing.T) {
	svc := SurahService{
		SurahRepo: stubSurahRepo{surah: domain.Surah{NameEn: "Al-Fatiha"}},
		AyahRepo:  stubAyahRepo{ayah: domain.Ayah{AyahNumber: 1, TextAr: "بسم"}},
	}

	surahs, err := svc.ListSurahs(context.Background())
	require.NoError(t, err)
	require.Len(t, surahs, 1)
	require.Equal(t, "Al-Fatiha", surahs[0].NameEn)

	ayah, err := svc.GetAyah(context.Background(), 42)
	require.NoError(t, err)
	require.Equal(t, int64(42), ayah.ID)
	require.Equal(t, "بسم", ayah.TextAr)

	byNumber, err := svc.GetAyahByNumber(context.Background(), 1, 1)
	require.NoError(t, err)
	require.Equal(t, int32(1), byNumber.SurahID)
	require.Equal(t, int32(1), byNumber.AyahNumber)
	require.Equal(t, "بسم", byNumber.TextAr)
}

func TestSurahService_ListSurahsError(t *testing.T) {
	listErr := errors.New("list failed")
	svc := SurahService{
		SurahRepo: stubSurahRepo{err: listErr},
		AyahRepo:  stubAyahRepo{},
	}

	_, err := svc.ListSurahs(context.Background())
	require.ErrorIs(t, err, listErr)
}

func TestSurahService_GetAyahError(t *testing.T) {
	getErr := errors.New("get failed")
	svc := SurahService{
		SurahRepo: stubSurahRepo{},
		AyahRepo:  stubAyahRepo{err: getErr},
	}

	_, err := svc.GetAyah(context.Background(), 1)
	require.ErrorIs(t, err, getErr)
}
