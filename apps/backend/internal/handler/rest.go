package handler

import (
	"database/sql"
	"encoding/json"
	"errors"
	"net/http"
	"strconv"
	"strings"
	"time"

	"quran-project/apps/backend/internal/enqueue"
	"quran-project/apps/backend/internal/service"
	"quran-project/apps/backend/internal/telemetry"
)

// REST exposes minimal read-only endpoints for surahs and ayahs.
type REST struct {
	SurahService service.SurahService
	DB           *sql.DB
	Enqueuer     *enqueue.Enqueuer
}

// Register wires endpoints onto provided mux under /api.
func (h REST) Register(mux *http.ServeMux) {
	mux.HandleFunc("/api/surahs", h.handleListSurahs)
	mux.HandleFunc("/api/surahs/", h.handleGetSurah)
	mux.HandleFunc("/api/scoring-jobs", h.handleScoringJobs)
	mux.HandleFunc("/api/scoring-jobs/", h.handleScoringJob)
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
	// Expected pattern: /api/surahs/{id}/ayahs?
	path := r.URL.Path[len("/api/surahs/"):]
	// Split optional suffix
	if path == "" {
		http.NotFound(w, r)
		return
	}

	var surahIDPart, suffix string
	if idx := len(path); idx > 0 {
		for i := 0; i < len(path); i++ {
			if path[i] == '/' {
				surahIDPart = path[:i]
				suffix = path[i:]
				break
			}
		}
	}
	if surahIDPart == "" {
		surahIDPart = path
	}

	surahID, err := strconv.Atoi(surahIDPart)
	if err != nil {
		http.Error(w, "invalid surah id", http.StatusBadRequest)
		return
	}

	if suffix == "/ayahs" {
		ayahs, err := h.SurahService.ListAyahs(r.Context(), int32(surahID))
		if err != nil {
			writeError(w, r, http.StatusInternalServerError, "failed to list ayahs", err)
			return
		}
		writeJSON(w, ayahs)
		return
	}

	surah, err := h.SurahService.GetSurah(r.Context(), int32(surahID))
	if err != nil {
		writeError(w, r, http.StatusNotFound, "surah not found", err)
		return
	}

	writeJSON(w, surah)
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

func (h REST) handleScoringJobs(w http.ResponseWriter, r *http.Request) {
	switch r.Method {
	case http.MethodPost:
		h.handleCreateScoringJob(w, r)
	default:
		w.WriteHeader(http.StatusMethodNotAllowed)
	}
}

func (h REST) handleScoringJob(w http.ResponseWriter, r *http.Request) {
	switch r.Method {
	case http.MethodGet:
		h.handleGetScoringJob(w, r)
	default:
		w.WriteHeader(http.StatusMethodNotAllowed)
	}
}

func (h REST) handleCreateScoringJob(w http.ResponseWriter, r *http.Request) {
	if h.DB == nil || h.Enqueuer == nil {
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
			expectedText = ayah.TextAR
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
	query := `
		INSERT INTO scoring_jobs (
			session_id, user_id, upload_key, surah_id, ayah_id, ayah_number, status, created_at, updated_at
		)
		VALUES ($1, $2, $3, $4, $5, $6, 'QUEUED', NOW(), NOW())
		ON CONFLICT (session_id)
		DO UPDATE SET
			user_id = EXCLUDED.user_id,
			upload_key = EXCLUDED.upload_key,
			surah_id = EXCLUDED.surah_id,
			ayah_id = EXCLUDED.ayah_id,
			ayah_number = EXCLUDED.ayah_number,
			status = 'QUEUED',
			updated_at = NOW()
		RETURNING created_at;
	`

	var createdAt time.Time
	var userID sql.NullString
	if req.UserID != "" {
		userID = sql.NullString{String: req.UserID, Valid: true}
	}
	if err := h.DB.QueryRowContext(
		r.Context(),
		query,
		sessionID,
		userID,
		req.UploadKey,
		int32(surahIDInt),
		ayahID,
		*req.AyahNumber,
	).Scan(&createdAt); err != nil {
		telemetry.Logger().ErrorContext(r.Context(), "persist scoring job failed",
			"session_id", sessionID, "error", err)
		http.Error(w, "failed to persist scoring job", http.StatusInternalServerError)
		return
	}

	if err := h.Enqueuer.PublishASRJob(r.Context(), sessionID, req.UploadKey, ayahID, expectedText, req.ReferenceAudioKey); err != nil {
		telemetry.Logger().ErrorContext(r.Context(), "enqueue scoring job failed",
			"session_id", sessionID, "ayah_id", ayahID, "error", err)
		_, _ = h.DB.ExecContext(
			r.Context(),
			`UPDATE scoring_jobs SET status = 'FAILED', updated_at = NOW() WHERE session_id = $1`,
			sessionID,
		)
		http.Error(w, "failed to enqueue scoring job", http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusCreated)
	writeJSON(w, scoringJobResponse{
		JobID:     sessionID,
		UploadKey: req.UploadKey,
		Status:    "QUEUED",
		Segments:  []scoreSegment{},
		CreatedAt: createdAt,
	})
}

func (h REST) handleGetScoringJob(w http.ResponseWriter, r *http.Request) {
	if h.DB == nil {
		http.Error(w, "scoring jobs not configured", http.StatusInternalServerError)
		return
	}

	sessionID := strings.TrimPrefix(r.URL.Path, "/api/scoring-jobs/")
	if sessionID == "" || strings.Contains(sessionID, "/") {
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
