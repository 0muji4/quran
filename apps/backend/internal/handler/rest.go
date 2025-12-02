package handler

import (
	"encoding/json"
	"net/http"
	"strconv"

	"quran-project/apps/backend/internal/service"
)

// REST exposes minimal read-only endpoints for surahs and ayahs.
type REST struct {
	SurahService service.SurahService
}

// Register wires endpoints onto provided mux under /api.
func (h REST) Register(mux *http.ServeMux) {
	mux.HandleFunc("/api/surahs", h.handleListSurahs)
	mux.HandleFunc("/api/surahs/", h.handleGetSurah)
}

func (h REST) handleListSurahs(w http.ResponseWriter, r *http.Request) {
	surahs, err := h.SurahService.ListSurahs(r.Context())
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
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
			http.Error(w, err.Error(), http.StatusInternalServerError)
			return
		}
		writeJSON(w, ayahs)
		return
	}

	surah, err := h.SurahService.GetSurah(r.Context(), int32(surahID))
	if err != nil {
		http.Error(w, err.Error(), http.StatusNotFound)
		return
	}

	writeJSON(w, surah)
}

func writeJSON(w http.ResponseWriter, v any) {
	w.Header().Set("Content-Type", "application/json")
	_ = json.NewEncoder(w).Encode(v)
}
