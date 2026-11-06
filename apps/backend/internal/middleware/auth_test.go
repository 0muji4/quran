package middleware

import (
	"net/http"
	"net/http/httptest"
	"testing"
)

func TestRequireBearerToken(t *testing.T) {
	tests := []struct {
		name   string
		path   string
		header string
		want   int
	}{
		{name: "valid token", path: "/api/surahs", header: "Bearer secret", want: http.StatusOK},
		{name: "missing header", path: "/api/surahs", want: http.StatusUnauthorized},
		{name: "wrong token", path: "/api/surahs", header: "Bearer other", want: http.StatusUnauthorized},
		{name: "wrong scheme", path: "/api/surahs", header: "Basic secret", want: http.StatusUnauthorized},
		{name: "empty token", path: "/api/surahs", header: "Bearer ", want: http.StatusUnauthorized},
		{name: "gRPC path without token", path: "/quran.v1.SurahService/ListSurahs", want: http.StatusUnauthorized},
		{name: "health check is open", path: "/healthz", want: http.StatusOK},
	}

	next := http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) {
		w.WriteHeader(http.StatusOK)
	})
	handler := RequireBearerToken("secret", next)

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			req := httptest.NewRequest(http.MethodGet, tt.path, nil)
			if tt.header != "" {
				req.Header.Set("Authorization", tt.header)
			}
			rec := httptest.NewRecorder()

			handler.ServeHTTP(rec, req)

			if rec.Code != tt.want {
				t.Errorf("status = %d, want %d", rec.Code, tt.want)
			}
		})
	}
}
