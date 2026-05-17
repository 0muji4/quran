package repo

import (
	"context"
	"database/sql"
	"encoding/json"
	"errors"

	"quran-project/apps/backend/internal/domain"
)

// PostgresRepository implements SurahRepository and AyahRepository using PostgreSQL.
type PostgresRepository struct {
	db *sql.DB
}

// NewPostgresRepository creates a new PostgreSQL-backed repository.
func NewPostgresRepository(db *sql.DB) *PostgresRepository {
	return &PostgresRepository{db: db}
}

// ListSurahs returns all surahs ordered by ID.
func (r *PostgresRepository) ListSurahs(ctx context.Context) ([]domain.Surah, error) {
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
			&s.NameAR,
			&s.NameEN,
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
func (r *PostgresRepository) GetSurah(ctx context.Context, id int32) (domain.Surah, error) {
	query := `
		SELECT id, name_ar, name_en, revelation_place, ayah_count, metadata, created_at, updated_at
		FROM surahs
		WHERE id = $1
	`

	var s domain.Surah
	var metadataJSON []byte

	err := r.db.QueryRowContext(ctx, query, id).Scan(
		&s.ID,
		&s.NameAR,
		&s.NameEN,
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
func (r *PostgresRepository) ListBySurah(ctx context.Context, surahID int32) ([]domain.Ayah, error) {
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
			&a.TextAR,
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
			a.TextEN = textEN.String
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

// GetAyah returns a single ayah by ID.
func (r *PostgresRepository) GetAyah(ctx context.Context, id int64) (domain.Ayah, error) {
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
		&a.TextAR,
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
		a.TextEN = textEN.String
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
