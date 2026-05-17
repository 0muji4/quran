package handler

import (
	"encoding/json"
	"fmt"
	"net/http"

	"quran-project/apps/backend/internal/service"
)

// GraphQLHandler is a lightweight placeholder for future schema-first
// GraphQL implementation.
//
// It is NOT a GraphQL server: the request parser below recognises only
// two literal query strings and uses fmt.Sscanf for the one with an
// argument. Before exposing this externally, swap in a real GraphQL
// library (gqlgen / graphql-go) and a proper schema. The placeholder
// exists so the route shape (`POST /graphql` returning
// `{"data": {...}}`) can be wired through middleware and tests today.
type GraphQLHandler struct {
	SurahService service.SurahService
}

// ServeHTTP accepts a minimal GraphQL-like payload with `{ surahs { ... } }` or `{ ayahs(surahId: X) { ... } }` queries.
func (h GraphQLHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	var payload struct {
		Query string `json:"query"`
	}
	if err := json.NewDecoder(r.Body).Decode(&payload); err != nil {
		http.Error(w, "invalid graphql request", http.StatusBadRequest)
		return
	}

	switch {
	case payload.Query == "{ surahs }":
		surahs, err := h.SurahService.ListSurahs(r.Context())
		if err != nil {
			writeError(w, r, http.StatusInternalServerError, "failed to list surahs", err)
			return
		}
		writeJSON(w, map[string]any{"data": map[string]any{"surahs": surahs}})
	case len(payload.Query) > 0:
		// Extremely small parser for ayah requests: { ayahs(surahId: 1) }
		var surahID int32
		_, err := fmt.Sscanf(payload.Query, "{ ayahs(surahId: %d) }", &surahID)
		if err != nil {
			http.Error(w, "unsupported query", http.StatusBadRequest)
			return
		}
		ayahs, err := h.SurahService.ListAyahs(r.Context(), surahID)
		if err != nil {
			writeError(w, r, http.StatusInternalServerError, "failed to list ayahs", err)
			return
		}
		writeJSON(w, map[string]any{"data": map[string]any{"ayahs": ayahs}})
	default:
		http.Error(w, "unknown query", http.StatusBadRequest)
	}
}
