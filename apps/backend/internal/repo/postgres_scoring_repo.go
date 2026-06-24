package repo

import (
	"context"
	"database/sql"
	"encoding/json"
	"errors"
	"time"
)

// Start inserts (or refreshes) the scoring_jobs row for the session in
// RUNNING state and returns the row's created_at timestamp. The status
// string must match the scoring_jobs_status_check CHECK constraint.
func (r *PostgresRepository) Start(ctx context.Context, p StartScoringJobParams) (time.Time, error) {
	var userID sql.NullString
	if p.UserID != "" {
		userID = sql.NullString{String: p.UserID, Valid: true}
	}
	var referenceAudioKey sql.NullString
	if p.ReferenceAudioKey != "" {
		referenceAudioKey = sql.NullString{String: p.ReferenceAudioKey, Valid: true}
	}
	const query = `
		INSERT INTO scoring_jobs (
			session_id, user_id, upload_key, surah_id, ayah_id, ayah_number, reference_audio_key, status, created_at, updated_at
		)
		VALUES ($1, $2, $3, $4, $5, $6, $7, 'RUNNING', NOW(), NOW())
		ON CONFLICT (session_id)
		DO UPDATE SET
			user_id = EXCLUDED.user_id,
			upload_key = EXCLUDED.upload_key,
			surah_id = EXCLUDED.surah_id,
			ayah_id = EXCLUDED.ayah_id,
			ayah_number = EXCLUDED.ayah_number,
			reference_audio_key = EXCLUDED.reference_audio_key,
			status = 'RUNNING',
			updated_at = NOW()
		RETURNING created_at;
	`
	var createdAt time.Time
	err := r.db.QueryRowContext(ctx, query, p.SessionID, userID, p.UploadKey, p.SurahID, p.AyahID, p.AyahNumber, referenceAudioKey).Scan(&createdAt)
	return createdAt, err
}

// Complete flips the job to COMPLETED with the final overall score and the
// pre-marshaled evaluation JSON.
func (r *PostgresRepository) Complete(ctx context.Context, sessionID string, score float64, evaluation json.RawMessage) error {
	_, err := r.db.ExecContext(
		ctx,
		`UPDATE scoring_jobs
		 SET status = 'COMPLETED', score = $2, evaluation = $3, updated_at = NOW()
		 WHERE session_id = $1`,
		sessionID, score, []byte(evaluation),
	)
	return err
}

// MarkFailed flips the job to FAILED. Callers may ignore the returned error
// so it does not mask the original failure that triggered the call.
func (r *PostgresRepository) MarkFailed(ctx context.Context, sessionID string) error {
	_, err := r.db.ExecContext(
		ctx,
		`UPDATE scoring_jobs SET status = 'FAILED', updated_at = NOW() WHERE session_id = $1`,
		sessionID,
	)
	return err
}

// Get loads the persisted scoring job for the session, returning
// ErrScoringJobNotFound when no row exists.
func (r *PostgresRepository) Get(ctx context.Context, sessionID string) (ScoringJob, error) {
	const query = `
		SELECT session_id, upload_key, status, score, verdict, evaluation, segments, created_at
		FROM scoring_jobs
		WHERE session_id = $1
	`
	var (
		job           ScoringJob
		score         sql.NullFloat64
		verdict       sql.NullString
		evaluationRaw []byte
		segmentsRaw   []byte
	)
	err := r.db.QueryRowContext(ctx, query, sessionID).Scan(
		&job.SessionID,
		&job.UploadKey,
		&job.Status,
		&score,
		&verdict,
		&evaluationRaw,
		&segmentsRaw,
		&job.CreatedAt,
	)
	if errors.Is(err, sql.ErrNoRows) {
		return ScoringJob{}, ErrScoringJobNotFound
	}
	if err != nil {
		return ScoringJob{}, err
	}
	if score.Valid {
		job.Score = &score.Float64
	}
	if verdict.Valid {
		job.Verdict = &verdict.String
	}
	if len(evaluationRaw) > 0 {
		job.Evaluation = json.RawMessage(evaluationRaw)
	}
	if len(segmentsRaw) > 0 {
		job.Segments = json.RawMessage(segmentsRaw)
	}
	return job, nil
}

var _ ScoringJobRepository = (*PostgresRepository)(nil)
