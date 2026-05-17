package handler

import (
	"bytes"
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

func (f fakeSurahRepo) List(ctx context.Context) ([]domain.Surah, error) {
	return f.listFn(ctx)
}

func (f fakeSurahRepo) GetSurah(ctx context.Context, id int32) (domain.Surah, error) {
	return f.getFn(ctx, id)
}

type fakeAyahRepo struct {
	listFn func(ctx context.Context, surahID int32) ([]domain.Ayah, error)
	getFn  func(ctx context.Context, id int64) (domain.Ayah, error)
}

func (f fakeAyahRepo) ListBySurah(ctx context.Context, surahID int32) ([]domain.Ayah, error) {
	return f.listFn(ctx, surahID)
}

func (f fakeAyahRepo) GetAyah(ctx context.Context, id int64) (domain.Ayah, error) {
	return f.getFn(ctx, id)
}

func TestRESTHandleGetSurah(t *testing.T) {
	svc := service.SurahService{
		SurahRepo: fakeSurahRepo{
			getFn: func(ctx context.Context, id int32) (domain.Surah, error) {
				return domain.Surah{ID: id, NameEN: "Al-Fatiha"}, nil
			},
		},
		AyahRepo: fakeAyahRepo{},
	}

	handler := REST{SurahService: svc}
	req := httptest.NewRequest(http.MethodGet, "/api/surahs/1", nil)
	req.URL.Path = "/api/surahs/1"
	recorder := httptest.NewRecorder()

	handler.handleGetSurah(recorder, req)

	require.Equal(t, http.StatusOK, recorder.Code)

	var result domain.Surah
	require.NoError(t, json.NewDecoder(recorder.Body).Decode(&result))
	require.Equal(t, int32(1), result.ID)
	require.Equal(t, "Al-Fatiha", result.NameEN)
}

func TestRESTHandleGetSurahInvalidID(t *testing.T) {
	svc := service.SurahService{
		SurahRepo: fakeSurahRepo{},
		AyahRepo:  fakeAyahRepo{},
	}
	handler := REST{SurahService: svc}

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
			req := httptest.NewRequest(http.MethodGet, test.path, nil)
			req.URL.Path = test.path
			recorder := httptest.NewRecorder()

			handler.handleGetSurah(recorder, req)

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

	handler := REST{SurahService: svc}
	req := httptest.NewRequest(http.MethodGet, "/api/surahs/1", nil)
	req.URL.Path = "/api/surahs/1"
	recorder := httptest.NewRecorder()

	handler.handleGetSurah(recorder, req)

	require.Equal(t, http.StatusNotFound, recorder.Code)
	require.Equal(t, "db failure\n", recorder.Body.String())
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

	handler := REST{SurahService: svc}
	req := httptest.NewRequest(http.MethodGet, "/api/surahs/99", nil)
	req.URL.Path = "/api/surahs/99"
	recorder := httptest.NewRecorder()

	handler.handleGetSurah(recorder, req)

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

	handler := REST{SurahService: svc}
	req := httptest.NewRequest(http.MethodGet, "/api/surahs/2/ayahs", nil)
	req.URL.Path = "/api/surahs/2/ayahs"
	recorder := httptest.NewRecorder()

	handler.handleGetSurah(recorder, req)

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

	handler := REST{SurahService: svc}
	req := httptest.NewRequest(http.MethodGet, "/api/surahs/abc/ayahs", nil)
	req.URL.Path = "/api/surahs/abc/ayahs"
	recorder := httptest.NewRecorder()

	handler.handleGetSurah(recorder, req)

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

	handler := REST{SurahService: svc}
	req := httptest.NewRequest(http.MethodGet, "/api/surahs/2/ayahs", nil)
	req.URL.Path = "/api/surahs/2/ayahs"
	recorder := httptest.NewRecorder()

	handler.handleGetSurah(recorder, req)

	require.Equal(t, http.StatusInternalServerError, recorder.Code)
	require.Equal(t, "list failed\n", recorder.Body.String())
}

func TestGraphQLHandlerServeHTTP(t *testing.T) {
	svc := service.SurahService{
		SurahRepo: fakeSurahRepo{
			listFn: func(ctx context.Context) ([]domain.Surah, error) {
				return []domain.Surah{{ID: 1, NameEN: "Al-Fatiha"}}, nil
			},
		},
		AyahRepo: fakeAyahRepo{},
	}
	handler := GraphQLHandler{SurahService: svc}

	body, err := json.Marshal(map[string]string{"query": "{ surahs }"})
	require.NoError(t, err)
	req := httptest.NewRequest(http.MethodPost, "/graphql", bytes.NewReader(body))
	recorder := httptest.NewRecorder()

	handler.ServeHTTP(recorder, req)

	require.Equal(t, http.StatusOK, recorder.Code)

	var payload map[string]map[string][]domain.Surah
	require.NoError(t, json.NewDecoder(recorder.Body).Decode(&payload))
	require.Len(t, payload["data"]["surahs"], 1)
}

func TestSurahGRPCServer(t *testing.T) {
	svc := service.SurahService{
		SurahRepo: fakeSurahRepo{
			getFn: func(ctx context.Context, id int32) (domain.Surah, error) {
				return domain.Surah{ID: id}, nil
			},
		},
		AyahRepo: fakeAyahRepo{
			listFn: func(ctx context.Context, surahID int32) ([]domain.Ayah, error) {
				return []domain.Ayah{{SurahID: surahID, AyahNumber: 1}}, nil
			},
		},
	}

	server := NewSurahGRPCServer(svc)

	_, err := server.GetSurah(context.Background(), nil)
	require.Error(t, err)

	resp, err := server.ListAyahs(context.Background(), &ListAyahsRequest{SurahID: 5})
	require.NoError(t, err)
	require.Len(t, resp.Ayahs, 1)
	require.Equal(t, int32(5), resp.Ayahs[0].SurahID)
}

var _ repo.SurahRepository = fakeSurahRepo{}
var _ repo.AyahRepository = fakeAyahRepo{}
