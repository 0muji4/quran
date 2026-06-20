//go:build integration

package testutil

import (
	"database/sql"
	"encoding/json"
	"testing"
	"time"

	"quran-project/apps/backend/internal/domain"
)

// SurahOption is a functional option for customizing Surah test data.
type SurahOption func(*domain.Surah)

// BuildSurah creates a test Surah with sensible defaults and optional overrides.
func BuildSurah(opts ...SurahOption) domain.Surah {
	s := domain.Surah{
		ID:              1,
		NameAr:          "الفاتحة",
		NameEn:          "Al-Fatiha",
		RevelationPlace: "Mecca",
		AyahCount:       7,
		Metadata: map[string]any{
			"translation": "The Opening",
			"order":       1,
		},
		CreatedAt: time.Now().UTC(),
		UpdatedAt: time.Now().UTC(),
	}

	for _, opt := range opts {
		opt(&s)
	}

	return s
}

// WithSurahID sets the surah ID.
func WithSurahID(id int32) SurahOption {
	return func(s *domain.Surah) {
		s.ID = id
	}
}

// WithSurahName sets both Arabic and English names.
func WithSurahName(ar, en string) SurahOption {
	return func(s *domain.Surah) {
		s.NameAr = ar
		s.NameEn = en
	}
}

// WithRevelationPlace sets the revelation place.
func WithRevelationPlace(place string) SurahOption {
	return func(s *domain.Surah) {
		s.RevelationPlace = place
	}
}

// WithAyahCount sets the ayah count.
func WithAyahCount(count int32) SurahOption {
	return func(s *domain.Surah) {
		s.AyahCount = count
	}
}

// AyahOption is a functional option for customizing Ayah test data.
type AyahOption func(*domain.Ayah)

// BuildAyah creates a test Ayah with sensible defaults and optional overrides.
func BuildAyah(opts ...AyahOption) domain.Ayah {
	a := domain.Ayah{
		ID:              1,
		SurahID:         1,
		AyahNumber:      1,
		TextAr:          "بِسْمِ ٱللَّهِ ٱلرَّحْمَـٰنِ ٱلرَّحِيمِ",
		TextEn:          "In the name of Allah, the Entirely Merciful, the Especially Merciful",
		Transliteration: "Bismillah ir-Rahman ir-Raheem",
		Metadata: map[string]any{
			"juz":    1,
			"page":   1,
			"manzil": 1,
		},
		CreatedAt: time.Now().UTC(),
		UpdatedAt: time.Now().UTC(),
	}

	for _, opt := range opts {
		opt(&a)
	}

	return a
}

// WithAyahID sets the ayah ID.
func WithAyahID(id int64) AyahOption {
	return func(a *domain.Ayah) {
		a.ID = id
	}
}

// WithSurahIDForAyah sets the surah ID for an ayah.
func WithSurahIDForAyah(surahID int32) AyahOption {
	return func(a *domain.Ayah) {
		a.SurahID = surahID
	}
}

// WithAyahNumber sets the ayah number.
func WithAyahNumber(num int32) AyahOption {
	return func(a *domain.Ayah) {
		a.AyahNumber = num
	}
}

// WithTextAr sets the Arabic text.
func WithTextAr(text string) AyahOption {
	return func(a *domain.Ayah) {
		a.TextAr = text
	}
}

// WithTextEn sets the English translation.
func WithTextEn(text string) AyahOption {
	return func(a *domain.Ayah) {
		a.TextEn = text
	}
}

// WithTransliteration sets the transliteration.
func WithTransliteration(text string) AyahOption {
	return func(a *domain.Ayah) {
		a.Transliteration = text
	}
}

// mustMarshalMetadata serialises test metadata to JSON or fails the
// test loudly. Replaces the prior pattern of dropping the marshal
// error which masked regressions when a new metadata type stops
// satisfying json.Marshaler.
func mustMarshalMetadata(t *testing.T, v map[string]any) []byte {
	t.Helper()
	b, err := json.Marshal(v)
	if err != nil {
		t.Fatalf("marshal metadata: %v", err)
	}
	return b
}

// SeedStandardData inserts a standard set of test data (Al-Fatiha) into the database.
func SeedStandardData(t *testing.T, db *sql.DB) {
	t.Helper()

	// Insert Al-Fatiha
	surah := BuildSurah()
	metadataJSON := mustMarshalMetadata(t, surah.Metadata)

	_, err := db.Exec(`
		INSERT INTO surahs (id, name_ar, name_en, revelation_place, ayah_count, metadata, created_at, updated_at)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
	`, surah.ID, surah.NameAr, surah.NameEn, surah.RevelationPlace, surah.AyahCount, metadataJSON, surah.CreatedAt, surah.UpdatedAt)
	if err != nil {
		t.Fatalf("failed to seed surah: %v", err)
	}

	// Insert 7 ayahs of Al-Fatiha
	ayahTexts := []struct {
		ar, en, trans string
	}{
		{"بِسْمِ ٱللَّهِ ٱلرَّحْمَـٰنِ ٱلرَّحِيمِ", "In the name of Allah, the Entirely Merciful, the Especially Merciful", "Bismillah ir-Rahman ir-Raheem"},
		{"ٱلْحَمْدُ لِلَّهِ رَبِّ ٱلْعَـٰلَمِينَ", "All praise is due to Allah, Lord of the worlds", "Alhamdu lillahi rabbil 'alamin"},
		{"ٱلرَّحْمَـٰنِ ٱلرَّحِيمِ", "The Entirely Merciful, the Especially Merciful", "Ar-Rahman ir-Raheem"},
		{"مَـٰلِكِ يَوْمِ ٱلدِّينِ", "Sovereign of the Day of Recompense", "Maliki yawmid-deen"},
		{"إِيَّاكَ نَعْبُدُ وَإِيَّاكَ نَسْتَعِينُ", "It is You we worship and You we ask for help", "Iyyaka na'budu wa iyyaka nasta'een"},
		{"ٱهْدِنَا ٱلصِّرَٰطَ ٱلْمُسْتَقِيمَ", "Guide us to the straight path", "Ihdinas-siratal-mustaqeem"},
		{"صِرَٰطَ ٱلَّذِينَ أَنْعَمْتَ عَلَيْهِمْ غَيْرِ ٱلْمَغْضُوبِ عَلَيْهِمْ وَلَا ٱلضَّآلِّينَ", "The path of those upon whom You have bestowed favor, not of those who have evoked anger or of those who are astray", "Siratal-latheena an'amta 'alayhim ghayril-maghdubi 'alayhim wa lad-dalleen"},
	}

	for i, text := range ayahTexts {
		ayah := BuildAyah(
			WithAyahID(int64(i+1)),
			WithAyahNumber(int32(i+1)),
			WithTextAr(text.ar),
			WithTextEn(text.en),
			WithTransliteration(text.trans),
		)

		metadataJSON := mustMarshalMetadata(t, ayah.Metadata)

		_, err := db.Exec(`
			INSERT INTO ayahs (id, surah_id, ayah_number, text_ar, text_en, transliteration, metadata, created_at, updated_at)
			VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
		`, ayah.ID, ayah.SurahID, ayah.AyahNumber, ayah.TextAr, ayah.TextEn, ayah.Transliteration, metadataJSON, ayah.CreatedAt, ayah.UpdatedAt)
		if err != nil {
			t.Fatalf("failed to seed ayah %d: %v", i+1, err)
		}
	}
}

// SeedMultipleSurahs inserts multiple surahs for pagination testing.
func SeedMultipleSurahs(t *testing.T, db *sql.DB, count int) {
	t.Helper()

	surahs := []struct {
		id              int32
		nameAR, nameEN  string
		revelationPlace string
		ayahCount       int32
	}{
		{1, "الفاتحة", "Al-Fatiha", "Mecca", 7},
		{2, "البقرة", "Al-Baqarah", "Medina", 286},
		{3, "آل عمران", "Ali 'Imran", "Medina", 200},
		{4, "النساء", "An-Nisa", "Medina", 176},
		{5, "المائدة", "Al-Ma'idah", "Medina", 120},
	}

	for i := 0; i < count && i < len(surahs); i++ {
		s := surahs[i]
		surah := BuildSurah(
			WithSurahID(s.id),
			WithSurahName(s.nameAR, s.nameEN),
			WithRevelationPlace(s.revelationPlace),
			WithAyahCount(s.ayahCount),
		)

		metadataJSON := mustMarshalMetadata(t, surah.Metadata)

		_, err := db.Exec(`
			INSERT INTO surahs (id, name_ar, name_en, revelation_place, ayah_count, metadata, created_at, updated_at)
			VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
		`, surah.ID, surah.NameAr, surah.NameEn, surah.RevelationPlace, surah.AyahCount, metadataJSON, surah.CreatedAt, surah.UpdatedAt)
		if err != nil {
			t.Fatalf("failed to seed surah %d: %v", s.id, err)
		}
	}
}
