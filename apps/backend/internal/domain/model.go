package domain

import "time"

// Surah captures high-level metadata about a chapter of the Quran.
//
// Entities carry no serialization tags: the transport shape is owned by
// the delivery layer (handler DTOs), so the domain stays independent of
// any wire format.
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
