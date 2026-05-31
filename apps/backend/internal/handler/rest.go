package handler

import (
	"context"
	"database/sql"
	"encoding/json"
	"errors"
	"net/http"
	"strconv"
	"time"

	"quran-project/apps/backend/internal/scoring"
	"quran-project/apps/backend/internal/service"
	"quran-project/apps/backend/internal/storage"
	"quran-project/apps/backend/internal/telemetry"
)

// REST exposes the HTTP surface for surahs, ayahs, and recitation scoring.
type REST struct {
	SurahService  service.SurahService
	DB            *sql.DB
	ScoringEngine *scoring.Engine
}

// Register wires endpoints onto provided mux under /api using Go 1.22+
// method+wildcard patterns. The {id} / {sessionID} segments are read
// back inside each handler via r.PathValue, replacing the previous
// hand-rolled path parser in handleGetSurah.
func (h REST) Register(mux *http.ServeMux) {
	mux.HandleFunc("GET /api/surahs", h.handleListSurahs)
	mux.HandleFunc("GET /api/surahs/{id}", h.handleGetSurah)
	mux.HandleFunc("GET /api/surahs/{id}/ayahs", h.handleListSurahAyahs)
	mux.HandleFunc("POST /api/scoring-jobs", h.handleCreateScoringJob)
	mux.HandleFunc("GET /api/scoring-jobs/{sessionID}", h.handleGetScoringJob)
}

func (h REST) handleListSurahs(w http.ResponseWriter, r *http.Request) {
	surahs, err := h.SurahService.ListSurahs(r.Context())
	if err != nil {
		writeError(w, r, http.StatusInternalServerError, "failed to list surahs", err)
		return
	}

	writeJSON(w, surahs)
}

func (h REST) handleGetSurah(w http.ResponseWriter, r *http.Request) {
	surahID, ok := parseSurahID(w, r)
	if !ok {
		return
	}

	surah, err := h.SurahService.GetSurah(r.Context(), surahID)
	if err != nil {
		writeError(w, r, http.StatusNotFound, "surah not found", err)
		return
	}

	writeJSON(w, surah)
}

func (h REST) handleListSurahAyahs(w http.ResponseWriter, r *http.Request) {
	surahID, ok := parseSurahID(w, r)
	if !ok {
		return
	}

	ayahs, err := h.SurahService.ListAyahs(r.Context(), surahID)
	if err != nil {
		writeError(w, r, http.StatusInternalServerError, "failed to list ayahs", err)
		return
	}

	writeJSON(w, ayahs)
}

// parseSurahID extracts and validates the {id} path value. It writes
// a 400 response and returns ok=false when the segment cannot be
// parsed as an int32; handlers should return early in that case.
func parseSurahID(w http.ResponseWriter, r *http.Request) (int32, bool) {
	raw := r.PathValue("id")
	id, err := strconv.Atoi(raw)
	if err != nil {
		http.Error(w, "invalid surah id", http.StatusBadRequest)
		return 0, false
	}
	return int32(id), true
}

type scoringJobRequest struct {
	SessionID         string `json:"sessionId"`
	UploadKey         string `json:"uploadKey"`
	SurahID           string `json:"surahId"`
	AyahNumber        *int32 `json:"ayahNumber"`
	UserID            string `json:"userId"`
	ReferenceAudioKey string `json:"referenceAudioKey,omitempty"`
}

type scoreSegment struct {
	Label   string         `json:"label"`
	Score   float64        `json:"score"`
	Metrics map[string]any `json:"metrics,omitempty"`
}

type scoringJobResponse struct {
	JobID      string         `json:"jobId"`
	UploadKey  string         `json:"uploadKey"`
	Status     string         `json:"status"`
	Score      *float64       `json:"score,omitempty"`
	Segments   []scoreSegment `json:"segments"`
	Verdict    *string        `json:"verdict,omitempty"`
	Evaluation map[string]any `json:"evaluation,omitempty"`
	CreatedAt  time.Time      `json:"createdAt"`
}

func (h REST) handleCreateScoringJob(w http.ResponseWriter, r *http.Request) {
	if h.DB == nil || h.ScoringEngine == nil {
		http.Error(w, "scoring jobs not configured", http.StatusInternalServerError)
		return
	}

	var req scoringJobRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "invalid request body", http.StatusBadRequest)
		return
	}
	if req.UploadKey == "" || req.SurahID == "" || req.AyahNumber == nil {
		http.Error(w, "uploadKey, surahId, and ayahNumber are required", http.StatusBadRequest)
		return
	}

	surahIDInt, err := strconv.Atoi(req.SurahID)
	if err != nil {
		http.Error(w, "invalid surahId", http.StatusBadRequest)
		return
	}

	ayahs, err := h.SurahService.ListAyahs(r.Context(), int32(surahIDInt))
	if err != nil {
		writeError(w, r, http.StatusInternalServerError, "failed to list ayahs", err)
		return
	}

	var ayahID int64
	var expectedText string
	for _, ayah := range ayahs {
		if ayah.AyahNumber == *req.AyahNumber {
			ayahID = ayah.ID
			expectedText = ayah.TextAr
			break
		}
	}
	if ayahID == 0 {
		http.Error(w, "ayah not found", http.StatusNotFound)
		return
	}

	sessionID := req.SessionID
	if sessionID == "" {
		sessionID = req.UploadKey
	}

	createdAt, err := upsertScoringJob(r.Context(), h.DB, sessionID, req, int32(surahIDInt), ayahID)
	if err != nil {
		telemetry.Logger().ErrorContext(r.Context(), "persist scoring job failed",
			"session_id", sessionID, "error", err)
		http.Error(w, "failed to persist scoring job", http.StatusInternalServerError)
		return
	}

	result, err := h.ScoringEngine.Score(r.Context(), req.UploadKey, expectedText)
	if err != nil {
		markJobFailed(r.Context(), h.DB, sessionID)
		if errors.Is(err, storage.ErrObjectNotFound) {
			writeError(w, r, http.StatusNotFound, "audio upload not found", err)
			return
		}
		writeError(w, r, http.StatusInternalServerError, "failed to score recitation", err)
		return
	}

	evaluation := map[string]any{
		"accuracy":     result.Score.Accuracy,
		"fluency":      result.Score.Fluency,
		"completeness": result.Score.Completeness,
		"wer":          result.WER,
		"transcript":   result.Transcript,
		"alignments":   result.Alignments,
	}
	evaluationJSON, err := json.Marshal(evaluation)
	if err != nil {
		markJobFailed(r.Context(), h.DB, sessionID)
		writeError(w, r, http.StatusInternalServerError, "failed to encode evaluation", err)
		return
	}

	if _, err := h.DB.ExecContext(
		r.Context(),
		`UPDATE scoring_jobs
		 SET status = 'COMPLETED', score = $2, evaluation = $3, updated_at = NOW()
		 WHERE session_id = $1`,
		sessionID, result.Score.Overall, evaluationJSON,
	); err != nil {
		writeError(w, r, http.StatusInternalServerError, "failed to persist score", err)
		return
	}

	telemetry.RecordSessionCompleted(r.Context(), req.UserID, result.Score.Overall)

	overall := result.Score.Overall
	w.WriteHeader(http.StatusCreated)
	writeJSON(w, scoringJobResponse{
		JobID:      sessionID,
		UploadKey:  req.UploadKey,
		Status:     "COMPLETED",
		Score:      &overall,
		Segments:   []scoreSegment{},
		Evaluation: evaluation,
		CreatedAt:  createdAt,
	})
}

// upsertScoringJob inserts (or refreshes) the scoring_jobs row for the
// session in PROCESSING state so a partial failure mid-pipeline leaves a
// trace, and returns the row's created_at timestamp.
func upsertScoringJob(ctx context.Context, db *sql.DB, sessionID string, req scoringJobRequest, surahID int32, ayahID int64) (time.Time, error) {
	var userID sql.NullString
	if req.UserID != "" {
		userID = sql.NullString{String: req.UserID, Valid: true}
	}
	const query = `
		INSERT INTO scoring_jobs (
			session_id, user_id, upload_key, surah_id, ayah_id, ayah_number, status, created_at, updated_at
		)
		VALUES ($1, $2, $3, $4, $5, $6, 'PROCESSING', NOW(), NOW())
		ON CONFLICT (session_id)
		DO UPDATE SET
			user_id = EXCLUDED.user_id,
			upload_key = EXCLUDED.upload_key,
			surah_id = EXCLUDED.surah_id,
			ayah_id = EXCLUDED.ayah_id,
			ayah_number = EXCLUDED.ayah_number,
			status = 'PROCESSING',
			updated_at = NOW()
		RETURNING created_at;
	`
	var createdAt time.Time
	err := db.QueryRowContext(ctx, query, sessionID, userID, req.UploadKey, surahID, ayahID, *req.AyahNumber).Scan(&createdAt)
	return createdAt, err
}

// markJobFailed best-effort flips the row to FAILED; logging is left to
// the caller since it already has the original error in hand. Errors here
// are swallowed so we don't mask the real failure that triggered the call.
func markJobFailed(ctx context.Context, db *sql.DB, sessionID string) {
	_, _ = db.ExecContext(
		ctx,
		`UPDATE scoring_jobs SET status = 'FAILED', updated_at = NOW() WHERE session_id = $1`,
		sessionID,
	)
}

func (h REST) handleGetScoringJob(w http.ResponseWriter, r *http.Request) {
	if h.DB == nil {
		http.Error(w, "scoring jobs not configured", http.StatusInternalServerError)
		return
	}

	sessionID := r.PathValue("sessionID")
	if sessionID == "" {
		http.NotFound(w, r)
		return
	}

	query := `
		SELECT session_id, upload_key, status, score, verdict, evaluation, segments, created_at
		FROM scoring_jobs
		WHERE session_id = $1
	`
	var (
		uploadKey     string
		status        string
		score         sql.NullFloat64
		verdict       sql.NullString
		evaluationRaw []byte
		segmentsRaw   []byte
		createdAt     time.Time
	)

	err := h.DB.QueryRowContext(r.Context(), query, sessionID).Scan(
		&sessionID,
		&uploadKey,
		&status,
		&score,
		&verdict,
		&evaluationRaw,
		&segmentsRaw,
		&createdAt,
	)
	if errors.Is(err, sql.ErrNoRows) {
		http.NotFound(w, r)
		return
	}
	if err != nil {
		http.Error(w, "failed to load scoring job", http.StatusInternalServerError)
		return
	}

	var evaluation map[string]any
	if len(evaluationRaw) > 0 {
		if err := json.Unmarshal(evaluationRaw, &evaluation); err != nil {
			http.Error(w, "failed to decode evaluation", http.StatusInternalServerError)
			return
		}
	}

	segments := []scoreSegment{}
	if len(segmentsRaw) > 0 {
		if err := json.Unmarshal(segmentsRaw, &segments); err != nil {
			http.Error(w, "failed to decode segments", http.StatusInternalServerError)
			return
		}
	}

	var scoreValue *float64
	if score.Valid {
		scoreValue = &score.Float64
	}

	var verdictValue *string
	if verdict.Valid {
		verdictValue = &verdict.String
	}

	writeJSON(w, scoringJobResponse{
		JobID:      sessionID,
		UploadKey:  uploadKey,
		Status:     status,
		Score:      scoreValue,
		Segments:   segments,
		Verdict:    verdictValue,
		Evaluation: evaluation,
		CreatedAt:  createdAt,
	})
}

func writeJSON(w http.ResponseWriter, v any) {
	w.Header().Set("Content-Type", "application/json")
	if err := json.NewEncoder(w).Encode(v); err != nil {
		// Body is already partially flushed; nothing actionable for
		// the client. Surface the failure so encoder regressions on
		// new response shapes are not silently dropped (Google
		// Decisions: don't ignore errors).
		telemetry.Logger().Warn("rest: encode response failed", "error", err)
	}
}

// writeError sends a sanitised message to the client and logs the
// underlying error with request context. Internal error text must not
// leak into the response body, per Google Best Practices "Errors at
// the API boundary".
func writeError(w http.ResponseWriter, r *http.Request, status int, msg string, err error) {
	if err != nil {
		telemetry.Logger().ErrorContext(r.Context(), msg,
			"status", status,
			"path", r.URL.Path,
			"error", err,
		)
	}
	http.Error(w, msg, status)
}
