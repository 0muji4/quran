package handler

import (
	"encoding/json"
	"errors"
	"net/http"
	"strconv"
	"time"

	"quran-project/apps/backend/internal/domain"
	"quran-project/apps/backend/internal/scoring"
	"quran-project/apps/backend/internal/service"
	"quran-project/apps/backend/internal/storage"
	"quran-project/apps/backend/internal/telemetry"
	"quran-project/apps/backend/internal/transcribe"
)

// REST exposes the HTTP surface for surahs, ayahs, and recitation scoring.
type REST struct {
	SurahService service.SurahService
	// Jobs is nil when scoring is not configured.
	Jobs *scoring.JobService
}

// Register wires the API endpoints onto mux.
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

	writeJSON(w, toSurahResponses(surahs))
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

	writeJSON(w, toSurahResponse(surah))
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

	writeJSON(w, toAyahResponses(ayahs))
}

// parseSurahID reads the {id} path value, writing a 400 and returning false
// when it is not an int32.
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

type scoringJobResponse struct {
	JobID      string          `json:"jobId"`
	UploadKey  string          `json:"uploadKey"`
	Status     string          `json:"status"`
	Score      *float64        `json:"score,omitempty"`
	Segments   json.RawMessage `json:"segments"`
	Verdict    *string         `json:"verdict,omitempty"`
	Evaluation json.RawMessage `json:"evaluation,omitempty"`
	CreatedAt  time.Time       `json:"createdAt"`
}

// emptyJSONArray is the default `segments` payload.
var emptyJSONArray = json.RawMessage("[]")

func (h REST) handleCreateScoringJob(w http.ResponseWriter, r *http.Request) {
	if h.Jobs == nil {
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

	surahID, err := strconv.Atoi(req.SurahID)
	if err != nil {
		http.Error(w, "invalid surahId", http.StatusBadRequest)
		return
	}

	result, err := h.Jobs.Create(r.Context(), scoring.JobInput{
		SessionID:         req.SessionID,
		UploadKey:         req.UploadKey,
		SurahID:           int32(surahID),
		AyahNumber:        *req.AyahNumber,
		UserID:            req.UserID,
		ReferenceAudioKey: req.ReferenceAudioKey,
	})
	if err != nil {
		switch {
		case errors.Is(err, domain.ErrAyahNotFound):
			http.Error(w, "ayah not found", http.StatusNotFound)
		case errors.Is(err, storage.ErrObjectNotFound):
			writeError(w, r, http.StatusNotFound, "audio upload not found", err)
		case errors.Is(err, transcribe.ErrUnavailable):
			writeError(w, r, http.StatusServiceUnavailable, "transcriber not configured (CHIRP_PROJECT)", err)
		default:
			writeError(w, r, http.StatusInternalServerError, "failed to score recitation", err)
		}
		return
	}

	telemetry.RecordSessionCompleted(r.Context(), req.UserID, result.Score)

	evaluationJSON, err := json.Marshal(result.Evaluation)
	if err != nil {
		writeError(w, r, http.StatusInternalServerError, "failed to encode evaluation", err)
		return
	}

	score := result.Score
	w.WriteHeader(http.StatusCreated)
	writeJSON(w, scoringJobResponse{
		JobID:      result.SessionID,
		UploadKey:  result.UploadKey,
		Status:     "COMPLETED",
		Score:      &score,
		Segments:   emptyJSONArray,
		Evaluation: evaluationJSON,
		CreatedAt:  result.CreatedAt,
	})
}

func (h REST) handleGetScoringJob(w http.ResponseWriter, r *http.Request) {
	if h.Jobs == nil {
		http.Error(w, "scoring jobs not configured", http.StatusInternalServerError)
		return
	}

	sessionID := r.PathValue("sessionID")
	if sessionID == "" {
		http.NotFound(w, r)
		return
	}

	job, err := h.Jobs.Get(r.Context(), sessionID)
	if errors.Is(err, domain.ErrScoringJobNotFound) {
		http.NotFound(w, r)
		return
	}
	if err != nil {
		writeError(w, r, http.StatusInternalServerError, "failed to load scoring job", err)
		return
	}

	segments := job.Segments
	if len(segments) == 0 {
		segments = emptyJSONArray
	}

	writeJSON(w, scoringJobResponse{
		JobID:      job.SessionID,
		UploadKey:  job.UploadKey,
		Status:     job.Status,
		Score:      job.Score,
		Segments:   segments,
		Verdict:    job.Verdict,
		Evaluation: job.Evaluation,
		CreatedAt:  job.CreatedAt,
	})
}

func writeJSON(w http.ResponseWriter, v any) {
	w.Header().Set("Content-Type", "application/json")
	if err := json.NewEncoder(w).Encode(v); err != nil {
		telemetry.Logger().Warn("rest: encode response failed", "error", err)
	}
}

// writeError logs err and sends a sanitized status message to the client.
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
