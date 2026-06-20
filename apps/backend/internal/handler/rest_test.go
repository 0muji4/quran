package handler

import (
	"context"
	"encoding/json"
	"errors"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/stretchr/testify/require"

	"quran-project/apps/backend/internal/domain"
	"quran-project/apps/backend/internal/repo"
	"quran-project/apps/backend/internal/service"
)

type fakeSurahRepo struct {
	listFn func(ctx context.Context) ([]domain.Surah, error)
	getFn  func(ctx context.Context, id int32) (domain.Surah, error)
}

func (f fakeSurahRepo) ListSurahs(ctx context.Context) ([]domain.Surah, error) {
	return f.listFn(ctx)
}

func (f fakeSurahRepo) GetSurah(ctx context.Context, id int32) (domain.Surah, error) {
	return f.getFn(ctx, id)
}

type fakeAyahRepo struct {
	listFn        func(ctx context.Context, surahID int32) ([]domain.Ayah, error)
	getFn         func(ctx context.Context, id int64) (domain.Ayah, error)
	getByNumberFn func(ctx context.Context, surahID, ayahNumber int32) (domain.Ayah, error)
}

func (f fakeAyahRepo) ListBySurah(ctx context.Context, surahID int32) ([]domain.Ayah, error) {
	return f.listFn(ctx, surahID)
}

func (f fakeAyahRepo) GetAyah(ctx context.Context, id int64) (domain.Ayah, error) {
	return f.getFn(ctx, id)
}

func (f fakeAyahRepo) GetByNumber(ctx context.Context, surahID, ayahNumber int32) (domain.Ayah, error) {
	return f.getByNumberFn(ctx, surahID, ayahNumber)
}

// serveREST routes a single request through a freshly-registered mux so
// tests exercise the same pattern-matching logic the production server
// uses (PathValue, method dispatch, 405 / 404 fallbacks).
func serveREST(t *testing.T, svc service.SurahService, method, path string) *httptest.ResponseRecorder {
	t.Helper()
	mux := http.NewServeMux()
	REST{SurahService: svc}.Register(mux)
	req := httptest.NewRequest(method, path, nil)
	recorder := httptest.NewRecorder()
	mux.ServeHTTP(recorder, req)
	return recorder
}

func TestRESTHandleGetSurah(t *testing.T) {
	svc := service.SurahService{
		SurahRepo: fakeSurahRepo{
			getFn: func(ctx context.Context, id int32) (domain.Surah, error) {
				return domain.Surah{ID: id, NameEn: "Al-Fatiha"}, nil
			},
		},
		AyahRepo: fakeAyahRepo{},
	}

	recorder := serveREST(t, svc, http.MethodGet, "/api/surahs/1")

	require.Equal(t, http.StatusOK, recorder.Code)

	var result domain.Surah
	require.NoError(t, json.NewDecoder(recorder.Body).Decode(&result))
	require.Equal(t, int32(1), result.ID)
	require.Equal(t, "Al-Fatiha", result.NameEn)
}

func TestRESTHandleGetSurahInvalidID(t *testing.T) {
	svc := service.SurahService{
		SurahRepo: fakeSurahRepo{},
		AyahRepo:  fakeAyahRepo{},
	}

	tests := []struct {
		name           string
		path           string
		expectedStatus int
		expectedBody   string
	}{
		{
			name:           "string id",
			path:           "/api/surahs/abc",
			expectedStatus: http.StatusBadRequest,
			expectedBody:   "invalid surah id\n",
		},
		{
			name:           "empty id",
			path:           "/api/surahs/",
			expectedStatus: http.StatusNotFound,
			expectedBody:   "404 page not found\n",
		},
	}

	for _, test := range tests {
		t.Run(test.name, func(t *testing.T) {
			recorder := serveREST(t, svc, http.MethodGet, test.path)
			require.Equal(t, test.expectedStatus, recorder.Code)
			require.Equal(t, test.expectedBody, recorder.Body.String())
		})
	}
}

func TestRESTHandleGetSurahRepoError(t *testing.T) {
	expectedErr := errors.New("db failure")
	svc := service.SurahService{
		SurahRepo: fakeSurahRepo{
			getFn: func(ctx context.Context, id int32) (domain.Surah, error) {
				return domain.Surah{}, expectedErr
			},
		},
		AyahRepo: fakeAyahRepo{},
	}

	recorder := serveREST(t, svc, http.MethodGet, "/api/surahs/1")

	require.Equal(t, http.StatusNotFound, recorder.Code)
	require.Equal(t, "surah not found\n", recorder.Body.String())
}

func TestRESTHandleGetSurahNotFound(t *testing.T) {
	svc := service.SurahService{
		SurahRepo: fakeSurahRepo{
			getFn: func(ctx context.Context, id int32) (domain.Surah, error) {
				return domain.Surah{}, errors.New("surah not found")
			},
		},
		AyahRepo: fakeAyahRepo{},
	}

	recorder := serveREST(t, svc, http.MethodGet, "/api/surahs/99")

	require.Equal(t, http.StatusNotFound, recorder.Code)
	require.Equal(t, "surah not found\n", recorder.Body.String())
}

func TestRESTHandleGetSurahAyahs(t *testing.T) {
	svc := service.SurahService{
		SurahRepo: fakeSurahRepo{},
		AyahRepo: fakeAyahRepo{
			listFn: func(ctx context.Context, surahID int32) ([]domain.Ayah, error) {
				return []domain.Ayah{{ID: 10, SurahID: surahID, AyahNumber: 1}}, nil
			},
		},
	}

	recorder := serveREST(t, svc, http.MethodGet, "/api/surahs/2/ayahs")

	require.Equal(t, http.StatusOK, recorder.Code)

	var result []domain.Ayah
	require.NoError(t, json.NewDecoder(recorder.Body).Decode(&result))
	require.Len(t, result, 1)
	require.Equal(t, int32(2), result[0].SurahID)
}

func TestRESTHandleGetSurahAyahsInvalidID(t *testing.T) {
	svc := service.SurahService{
		SurahRepo: fakeSurahRepo{},
		AyahRepo:  fakeAyahRepo{},
	}

	recorder := serveREST(t, svc, http.MethodGet, "/api/surahs/abc/ayahs")

	require.Equal(t, http.StatusBadRequest, recorder.Code)
	require.Equal(t, "invalid surah id\n", recorder.Body.String())
}

func TestRESTHandleGetSurahAyahsRepoError(t *testing.T) {
	svc := service.SurahService{
		SurahRepo: fakeSurahRepo{},
		AyahRepo: fakeAyahRepo{
			listFn: func(ctx context.Context, surahID int32) ([]domain.Ayah, error) {
				return nil, errors.New("list failed")
			},
		},
	}

	recorder := serveREST(t, svc, http.MethodGet, "/api/surahs/2/ayahs")

	require.Equal(t, http.StatusInternalServerError, recorder.Code)
	require.Equal(t, "failed to list ayahs\n", recorder.Body.String())
}

var _ repo.SurahRepository = fakeSurahRepo{}
var _ repo.AyahRepository = fakeAyahRepo{}
