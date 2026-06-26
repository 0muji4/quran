package domain

import "time"

// Entities carry no serialization tags; the wire shape is owned by the
// delivery layer (handler DTOs).

// Surah captures high-level metadata about a chapter of the Quran.
type Surah struct {
	ID              int32
	NameAr          string
	NameEn          string
	RevelationPlace string
	AyahCount       int32
	Metadata        map[string]any
	CreatedAt       time.Time
	UpdatedAt       time.Time
}

// Ayah represents a verse with multilingual content.
type Ayah struct {
	ID              int64
	SurahID         int32
	AyahNumber      int32
	TextAr          string
	TextEn          string
	Transliteration string
	Metadata        map[string]any
	CreatedAt       time.Time
	UpdatedAt       time.Time
}
