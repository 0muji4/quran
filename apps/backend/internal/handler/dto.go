package handler

import (
	"time"

	"quran-project/apps/backend/internal/domain"
)

// Wire DTOs own the JSON contract for surah/ayah reads. Keeping the tags
// here (rather than on domain entities) lets the API shape evolve without
// touching the domain, and keeps the domain free of transport concerns.

type surahResponse struct {
	ID              int32          `json:"id"`
	NameAr          string         `json:"name_ar"`
	NameEn          string         `json:"name_en"`
	RevelationPlace string         `json:"revelation_place"`
	AyahCount       int32          `json:"ayah_count"`
	Metadata        map[string]any `json:"metadata,omitempty"`
	CreatedAt       time.Time      `json:"created_at"`
	UpdatedAt       time.Time      `json:"updated_at"`
}

type ayahResponse struct {
	ID              int64          `json:"id"`
	SurahID         int32          `json:"surah_id"`
	AyahNumber      int32          `json:"ayah_number"`
	TextAr          string         `json:"text_ar"`
	TextEn          string         `json:"text_en,omitempty"`
	Transliteration string         `json:"transliteration,omitempty"`
	Metadata        map[string]any `json:"metadata,omitempty"`
	CreatedAt       time.Time      `json:"created_at"`
	UpdatedAt       time.Time      `json:"updated_at"`
}

func toSurahResponse(s domain.Surah) surahResponse {
	return surahResponse{
		ID:              s.ID,
		NameAr:          s.NameAr,
		NameEn:          s.NameEn,
		RevelationPlace: s.RevelationPlace,
		AyahCount:       s.AyahCount,
		Metadata:        s.Metadata,
		CreatedAt:       s.CreatedAt,
		UpdatedAt:       s.UpdatedAt,
	}
}

func toAyahResponse(a domain.Ayah) ayahResponse {
	return ayahResponse{
		ID:              a.ID,
		SurahID:         a.SurahID,
		AyahNumber:      a.AyahNumber,
		TextAr:          a.TextAr,
		TextEn:          a.TextEn,
		Transliteration: a.Transliteration,
		Metadata:        a.Metadata,
		CreatedAt:       a.CreatedAt,
		UpdatedAt:       a.UpdatedAt,
	}
}

func toSurahResponses(surahs []domain.Surah) []surahResponse {
	out := make([]surahResponse, len(surahs))
	for i, s := range surahs {
		out[i] = toSurahResponse(s)
	}
	return out
}

func toAyahResponses(ayahs []domain.Ayah) []ayahResponse {
	out := make([]ayahResponse, len(ayahs))
	for i, a := range ayahs {
		out[i] = toAyahResponse(a)
	}
	return out
}
