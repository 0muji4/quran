package domain

import "time"

// Surah captures high-level metadata about a chapter of the Quran.
type Surah struct {
	ID              int32          `json:"id"`
	NameAr          string         `json:"name_ar"`
	NameEn          string         `json:"name_en"`
	RevelationPlace string         `json:"revelation_place"`
	AyahCount       int32          `json:"ayah_count"`
	Metadata        map[string]any `json:"metadata,omitempty"`
	CreatedAt       time.Time      `json:"created_at"`
	UpdatedAt       time.Time      `json:"updated_at"`
}

// Ayah represents a verse with multilingual content.
type Ayah struct {
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
