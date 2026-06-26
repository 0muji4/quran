// Package postgres is the PostgreSQL adapter for the repo ports. It depends
// inward on repo (the port package) and domain; the use-case layer depends
// only on the ports, never on this driver-bound package.
package postgres

import (
	"context"
	"database/sql"
	"encoding/json"
	"errors"

	"quran-project/apps/backend/internal/domain"
)

// Repository implements repo.SurahRepository, repo.AyahRepository, and
// repo.ScoringJobRepository using PostgreSQL.
type Repository struct {
	db *sql.DB
}

// NewRepository creates a new PostgreSQL-backed repository.
func NewRepository(db *sql.DB) *Repository {
	return &Repository{db: db}
}

// ListSurahs returns all surahs ordered by ID.
func (r *Repository) ListSurahs(ctx context.Context) ([]domain.Surah, error) {
	query := `
		SELECT id, name_ar, name_en, revelation_place, ayah_count, metadata, created_at, updated_at
		FROM surahs
		ORDER BY id
	`

	rows, err := r.db.QueryContext(ctx, query)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var surahs []domain.Surah
	for rows.Next() {
		var s domain.Surah
		var metadataJSON []byte

		err := rows.Scan(
			&s.ID,
			&s.NameAr,
			&s.NameEn,
			&s.RevelationPlace,
			&s.AyahCount,
			&metadataJSON,
			&s.CreatedAt,
			&s.UpdatedAt,
		)
		if err != nil {
			return nil, err
		}

		// Parse JSONB metadata
		if len(metadataJSON) > 0 {
			if err := json.Unmarshal(metadataJSON, &s.Metadata); err != nil {
				return nil, err
			}
		}

		surahs = append(surahs, s)
	}

	if err := rows.Err(); err != nil {
		return nil, err
	}

	return surahs, nil
}

// GetSurah returns a single surah by ID.
func (r *Repository) GetSurah(ctx context.Context, id int32) (domain.Surah, error) {
	query := `
		SELECT id, name_ar, name_en, revelation_place, ayah_count, metadata, created_at, updated_at
		FROM surahs
		WHERE id = $1
	`

	var s domain.Surah
	var metadataJSON []byte

	err := r.db.QueryRowContext(ctx, query, id).Scan(
		&s.ID,
		&s.NameAr,
		&s.NameEn,
		&s.RevelationPlace,
		&s.AyahCount,
		&metadataJSON,
		&s.CreatedAt,
		&s.UpdatedAt,
	)

	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return domain.Surah{}, errors.New("surah not found")
		}
		return domain.Surah{}, err
	}

	// Parse JSONB metadata
	if len(metadataJSON) > 0 {
		if err := json.Unmarshal(metadataJSON, &s.Metadata); err != nil {
			return domain.Surah{}, err
		}
	}

	return s, nil
}

// ListBySurah returns all ayahs for a given surah, ordered by ayah number.
func (r *Repository) ListBySurah(ctx context.Context, surahID int32) ([]domain.Ayah, error) {
	query := `
		SELECT id, surah_id, ayah_number, text_ar, text_en, transliteration, metadata, created_at, updated_at
		FROM ayahs
		WHERE surah_id = $1
		ORDER BY ayah_number
	`

	rows, err := r.db.QueryContext(ctx, query, surahID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var ayahs []domain.Ayah
	for rows.Next() {
		var a domain.Ayah
		var metadataJSON []byte
		var textEN, transliteration sql.NullString

		err := rows.Scan(
			&a.ID,
			&a.SurahID,
			&a.AyahNumber,
			&a.TextAr,
			&textEN,
			&transliteration,
			&metadataJSON,
			&a.CreatedAt,
			&a.UpdatedAt,
		)
		if err != nil {
			return nil, err
		}

		// Handle nullable fields
		if textEN.Valid {
			a.TextEn = textEN.String
		}
		if transliteration.Valid {
			a.Transliteration = transliteration.String
		}

		// Parse JSONB metadata
		if len(metadataJSON) > 0 {
			if err := json.Unmarshal(metadataJSON, &a.Metadata); err != nil {
				return nil, err
			}
		}

		ayahs = append(ayahs, a)
	}

	if err := rows.Err(); err != nil {
		return nil, err
	}

	return ayahs, nil
}

// GetByNumber returns a single ayah by its (surahID, ayahNumber) pair,
// returning domain.ErrAyahNotFound when no row matches. This avoids loading an
// entire surah just to resolve one verse.
func (r *Repository) GetByNumber(ctx context.Context, surahID, ayahNumber int32) (domain.Ayah, error) {
	query := `
		SELECT id, surah_id, ayah_number, text_ar, text_en, transliteration, metadata, created_at, updated_at
		FROM ayahs
		WHERE surah_id = $1 AND ayah_number = $2
	`

	var a domain.Ayah
	var metadataJSON []byte
	var textEN, transliteration sql.NullString

	err := r.db.QueryRowContext(ctx, query, surahID, ayahNumber).Scan(
		&a.ID,
		&a.SurahID,
		&a.AyahNumber,
		&a.TextAr,
		&textEN,
		&transliteration,
		&metadataJSON,
		&a.CreatedAt,
		&a.UpdatedAt,
	)

	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return domain.Ayah{}, domain.ErrAyahNotFound
		}
		return domain.Ayah{}, err
	}

	if textEN.Valid {
		a.TextEn = textEN.String
	}
	if transliteration.Valid {
		a.Transliteration = transliteration.String
	}

	if len(metadataJSON) > 0 {
		if err := json.Unmarshal(metadataJSON, &a.Metadata); err != nil {
			return domain.Ayah{}, err
		}
	}

	return a, nil
}

// GetAyah returns a single ayah by ID.
func (r *Repository) GetAyah(ctx context.Context, id int64) (domain.Ayah, error) {
	query := `
		SELECT id, surah_id, ayah_number, text_ar, text_en, transliteration, metadata, created_at, updated_at
		FROM ayahs
		WHERE id = $1
	`

	var a domain.Ayah
	var metadataJSON []byte
	var textEN, transliteration sql.NullString

	err := r.db.QueryRowContext(ctx, query, id).Scan(
		&a.ID,
		&a.SurahID,
		&a.AyahNumber,
		&a.TextAr,
		&textEN,
		&transliteration,
		&metadataJSON,
		&a.CreatedAt,
		&a.UpdatedAt,
	)

	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return domain.Ayah{}, errors.New("ayah not found")
		}
		return domain.Ayah{}, err
	}

	// Handle nullable fields
	if textEN.Valid {
		a.TextEn = textEN.String
	}
	if transliteration.Valid {
		a.Transliteration = transliteration.String
	}

	// Parse JSONB metadata
	if len(metadataJSON) > 0 {
		if err := json.Unmarshal(metadataJSON, &a.Metadata); err != nil {
			return domain.Ayah{}, err
		}
	}

	return a, nil
}
