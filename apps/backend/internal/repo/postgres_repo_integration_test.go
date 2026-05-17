//go:build integration

package repo_test

import (
	"context"
	"testing"

	"github.com/stretchr/testify/require"

	"quran-project/apps/backend/internal/repo"
	"quran-project/apps/backend/internal/testutil"
)

func TestPostgresRepository_List(t *testing.T) {
	testutil.SkipIfShort(t)

	db, cleanup := testutil.SetupTestDB(t)
	defer cleanup()

	repository := repo.NewPostgresRepository(db)

	t.Run("returns empty list when no surahs exist", func(t *testing.T) {
		testutil.CleanupTables(t, db)

		surahs, err := repository.ListSurahs(context.Background())

		require.NoError(t, err)
		require.Empty(t, surahs)
	})

	t.Run("returns all surahs ordered by ID", func(t *testing.T) {
		testutil.CleanupTables(t, db)
		testutil.SeedMultipleSurahs(t, db, 5)

		surahs, err := repository.ListSurahs(context.Background())

		require.NoError(t, err)
		require.Len(t, surahs, 5)

		// Verify ordering
		require.Equal(t, int32(1), surahs[0].ID)
		require.Equal(t, "Al-Fatiha", surahs[0].NameEN)
		require.Equal(t, int32(2), surahs[1].ID)
		require.Equal(t, "Al-Baqarah", surahs[1].NameEN)
	})

	t.Run("correctly parses JSONB metadata", func(t *testing.T) {
		testutil.CleanupTables(t, db)
		testutil.SeedStandardData(t, db)

		surahs, err := repository.ListSurahs(context.Background())

		require.NoError(t, err)
		require.Len(t, surahs, 1)

		// Verify metadata was unmarshaled correctly
		require.NotNil(t, surahs[0].Metadata)
		require.Contains(t, surahs[0].Metadata, "translation")
		require.Equal(t, "The Opening", surahs[0].Metadata["translation"])
	})

	t.Run("handles NULL metadata gracefully", func(t *testing.T) {
		testutil.CleanupTables(t, db)

		// Insert surah with NULL metadata
		_, err := db.Exec(`
			INSERT INTO surahs (id, name_ar, name_en, revelation_place, ayah_count, metadata)
			VALUES ($1, $2, $3, $4, $5, NULL)
		`, 1, "الفاتحة", "Al-Fatiha", "Mecca", 7)
		require.NoError(t, err)

		surahs, err := repository.ListSurahs(context.Background())

		require.NoError(t, err)
		require.Len(t, surahs, 1)
		require.Nil(t, surahs[0].Metadata)
	})
}

func TestPostgresRepository_GetSurah(t *testing.T) {
	testutil.SkipIfShort(t)

	db, cleanup := testutil.SetupTestDB(t)
	defer cleanup()

	repository := repo.NewPostgresRepository(db)

	t.Run("returns surah when it exists", func(t *testing.T) {
		testutil.CleanupTables(t, db)
		testutil.SeedStandardData(t, db)

		surah, err := repository.GetSurah(context.Background(), 1)

		require.NoError(t, err)
		require.Equal(t, int32(1), surah.ID)
		require.Equal(t, "الفاتحة", surah.NameAR)
		require.Equal(t, "Al-Fatiha", surah.NameEN)
		require.Equal(t, "Mecca", surah.RevelationPlace)
		require.Equal(t, int32(7), surah.AyahCount)
		require.NotNil(t, surah.Metadata)
	})

	t.Run("returns error when surah not found", func(t *testing.T) {
		testutil.CleanupTables(t, db)

		_, err := repository.GetSurah(context.Background(), 999)

		require.Error(t, err)
		require.Contains(t, err.Error(), "surah not found")
	})

	t.Run("correctly unmarshals JSONB metadata", func(t *testing.T) {
		testutil.CleanupTables(t, db)
		testutil.SeedStandardData(t, db)

		surah, err := repository.GetSurah(context.Background(), 1)

		require.NoError(t, err)
		require.NotNil(t, surah.Metadata)
		require.Contains(t, surah.Metadata, "order")

		// JSONB numbers are unmarshaled as float64
		order, ok := surah.Metadata["order"].(float64)
		require.True(t, ok)
		require.Equal(t, float64(1), order)
	})
}

func TestPostgresRepository_ListBySurah(t *testing.T) {
	testutil.SkipIfShort(t)

	db, cleanup := testutil.SetupTestDB(t)
	defer cleanup()

	repository := repo.NewPostgresRepository(db)

	t.Run("returns all ayahs for a surah ordered by ayah number", func(t *testing.T) {
		testutil.CleanupTables(t, db)
		testutil.SeedStandardData(t, db)

		ayahs, err := repository.ListBySurah(context.Background(), 1)

		require.NoError(t, err)
		require.Len(t, ayahs, 7)

		// Verify ordering
		for i, ayah := range ayahs {
			require.Equal(t, int32(i+1), ayah.AyahNumber)
			require.Equal(t, int32(1), ayah.SurahID)
		}
	})

	t.Run("returns empty list when surah has no ayahs", func(t *testing.T) {
		testutil.CleanupTables(t, db)

		// Insert surah without ayahs
		testutil.SeedMultipleSurahs(t, db, 1)

		ayahs, err := repository.ListBySurah(context.Background(), 1)

		require.NoError(t, err)
		require.Empty(t, ayahs)
	})

	t.Run("handles NULL text_en and transliteration", func(t *testing.T) {
		testutil.CleanupTables(t, db)
		testutil.SeedStandardData(t, db)

		// Update one ayah to have NULL fields
		_, err := db.Exec(`
			UPDATE ayahs SET text_en = NULL, transliteration = NULL WHERE ayah_number = 1
		`)
		require.NoError(t, err)

		ayahs, err := repository.ListBySurah(context.Background(), 1)

		require.NoError(t, err)
		require.Len(t, ayahs, 7)

		// First ayah should have empty strings for NULL fields
		require.Empty(t, ayahs[0].TextEN)
		require.Empty(t, ayahs[0].Transliteration)

		// Other ayahs should have values
		require.NotEmpty(t, ayahs[1].TextEN)
		require.NotEmpty(t, ayahs[1].Transliteration)
	})

	t.Run("correctly parses JSONB metadata", func(t *testing.T) {
		testutil.CleanupTables(t, db)
		testutil.SeedStandardData(t, db)

		ayahs, err := repository.ListBySurah(context.Background(), 1)

		require.NoError(t, err)
		require.NotEmpty(t, ayahs)

		// Verify metadata
		require.NotNil(t, ayahs[0].Metadata)
		require.Contains(t, ayahs[0].Metadata, "juz")
	})
}

func TestPostgresRepository_GetAyah(t *testing.T) {
	testutil.SkipIfShort(t)

	db, cleanup := testutil.SetupTestDB(t)
	defer cleanup()

	repository := repo.NewPostgresRepository(db)

	t.Run("returns ayah when it exists", func(t *testing.T) {
		testutil.CleanupTables(t, db)
		testutil.SeedStandardData(t, db)

		ayah, err := repository.GetAyah(context.Background(), 1)

		require.NoError(t, err)
		require.Equal(t, int64(1), ayah.ID)
		require.Equal(t, int32(1), ayah.SurahID)
		require.Equal(t, int32(1), ayah.AyahNumber)
		require.NotEmpty(t, ayah.TextAR)
		require.NotEmpty(t, ayah.TextEN)
		require.NotEmpty(t, ayah.Transliteration)
	})

	t.Run("returns error when ayah not found", func(t *testing.T) {
		testutil.CleanupTables(t, db)

		_, err := repository.GetAyah(context.Background(), 99999)

		require.Error(t, err)
		require.Contains(t, err.Error(), "ayah not found")
	})

	t.Run("handles NULL text_en correctly", func(t *testing.T) {
		testutil.CleanupTables(t, db)
		testutil.SeedStandardData(t, db)

		// Update ayah to have NULL text_en
		_, err := db.Exec(`UPDATE ayahs SET text_en = NULL WHERE id = 1`)
		require.NoError(t, err)

		ayah, err := repository.GetAyah(context.Background(), 1)

		require.NoError(t, err)
		require.Empty(t, ayah.TextEN)
		require.NotEmpty(t, ayah.TextAR) // Arabic text should still exist
	})

	t.Run("correctly unmarshals JSONB metadata", func(t *testing.T) {
		testutil.CleanupTables(t, db)
		testutil.SeedStandardData(t, db)

		ayah, err := repository.GetAyah(context.Background(), 1)

		require.NoError(t, err)
		require.NotNil(t, ayah.Metadata)
		require.Contains(t, ayah.Metadata, "page")
	})
}

func TestPostgresRepository_ConcurrentAccess(t *testing.T) {
	testutil.SkipIfShort(t)

	db, cleanup := testutil.SetupTestDB(t)
	defer cleanup()

	repository := repo.NewPostgresRepository(db)

	testutil.CleanupTables(t, db)
	testutil.SeedStandardData(t, db)

	t.Run("handles concurrent reads safely", func(t *testing.T) {
		// Run 10 concurrent queries
		done := make(chan bool, 10)
		for i := 0; i < 10; i++ {
			go func() {
				surahs, err := repository.ListSurahs(context.Background())
				require.NoError(t, err)
				require.Len(t, surahs, 1)
				done <- true
			}()
		}

		// Wait for all goroutines to complete
		for i := 0; i < 10; i++ {
			<-done
		}
	})
}

func TestPostgresRepository_ContextCancellation(t *testing.T) {
	testutil.SkipIfShort(t)

	db, cleanup := testutil.SetupTestDB(t)
	defer cleanup()

	repository := repo.NewPostgresRepository(db)

	testutil.CleanupTables(t, db)
	testutil.SeedStandardData(t, db)

	t.Run("respects context cancellation", func(t *testing.T) {
		ctx, cancel := context.WithCancel(context.Background())
		cancel() // Cancel immediately

		_, err := repository.ListSurahs(ctx)

		require.Error(t, err)
		require.Contains(t, err.Error(), "context canceled")
	})
}
