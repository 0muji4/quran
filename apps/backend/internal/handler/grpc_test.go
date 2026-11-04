package handler

import (
	"context"
	"encoding/json"
	"errors"
	"io"
	"net"
	"net/http"
	"strings"
	"testing"
	"time"

	"github.com/stretchr/testify/require"
	"google.golang.org/grpc"
	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/credentials/insecure"
	"google.golang.org/grpc/status"

	"quran-project/apps/backend/internal/domain"
	quranpb "quran-project/apps/backend/internal/gen/quran/v1"
	"quran-project/apps/backend/internal/repo"
	"quran-project/apps/backend/internal/scoring"
	"quran-project/apps/backend/internal/service"
	"quran-project/apps/backend/internal/storage"
	"quran-project/apps/backend/internal/transcribe"
)

// startServer serves gRPC and REST from one cleartext port, as cmd/server does.
func startServer(t *testing.T, svc service.SurahService, jobs *scoring.JobService) (string, *grpc.ClientConn) {
	t.Helper()

	mux := http.NewServeMux()
	REST{SurahService: svc, Jobs: jobs}.Register(mux)

	protocols := new(http.Protocols)
	protocols.SetHTTP1(true)
	protocols.SetUnencryptedHTTP2(true)
	server := &http.Server{Handler: Multiplex(NewGRPCServer(svc, jobs), mux), Protocols: protocols}

	listener, err := net.Listen("tcp", "127.0.0.1:0")
	require.NoError(t, err)
	go func() { _ = server.Serve(listener) }()
	t.Cleanup(func() { _ = server.Close() })

	conn, err := grpc.NewClient(listener.Addr().String(), grpc.WithTransportCredentials(insecure.NewCredentials()))
	require.NoError(t, err)
	t.Cleanup(func() { _ = conn.Close() })

	return listener.Addr().String(), conn
}

func surahService() service.SurahService {
	return service.SurahService{
		SurahRepo: fakeSurahRepo{
			listFn: func(context.Context) ([]domain.Surah, error) {
				return []domain.Surah{{ID: 1, NameEn: "Al-Fatiha", Metadata: map[string]any{"juz": 1.0}}}, nil
			},
			getFn: func(_ context.Context, id int32) (domain.Surah, error) {
				if id == 1 {
					return domain.Surah{ID: 1, NameEn: "Al-Fatiha"}, nil
				}
				return domain.Surah{}, domain.ErrSurahNotFound
			},
		},
		AyahRepo: fakeAyahRepo{
			listFn: func(_ context.Context, surahID int32) ([]domain.Ayah, error) {
				return []domain.Ayah{{ID: 7, SurahID: surahID, AyahNumber: 1, TextAr: "ٱلْحَمْدُ"}}, nil
			},
			getByNumberFn: func(_ context.Context, surahID, ayahNumber int32) (domain.Ayah, error) {
				switch ayahNumber {
				case 1:
					return domain.Ayah{ID: 7, SurahID: surahID, AyahNumber: 1, Metadata: map[string]any{}}, nil
				case 2:
					return domain.Ayah{}, errors.New("db down")
				}
				return domain.Ayah{}, domain.ErrAyahNotFound
			},
		},
	}
}

func TestGRPCAndRESTShareOnePort(t *testing.T) {
	addr, conn := startServer(t, surahService(), nil)

	grpcResp, err := quranpb.NewSurahServiceClient(conn).ListSurahs(t.Context(), &quranpb.ListSurahsRequest{})
	require.NoError(t, err)
	require.Len(t, grpcResp.GetSurahs(), 1)
	require.Equal(t, "Al-Fatiha", grpcResp.GetSurahs()[0].GetNameEn())
	require.Equal(t, 1.0, grpcResp.GetSurahs()[0].GetMetadata().AsMap()["juz"])

	restResp, err := http.Get("http://" + addr + "/api/surahs")
	require.NoError(t, err)
	defer restResp.Body.Close()
	require.Equal(t, http.StatusOK, restResp.StatusCode)
	body, err := io.ReadAll(restResp.Body)
	require.NoError(t, err)
	require.Contains(t, string(body), "Al-Fatiha")
}

func TestGRPCGetSurah(t *testing.T) {
	_, conn := startServer(t, surahService(), nil)
	client := quranpb.NewSurahServiceClient(conn)

	resp, err := client.GetSurah(t.Context(), &quranpb.GetSurahRequest{SurahId: 1})
	require.NoError(t, err)
	require.Equal(t, int32(1), resp.GetSurah().GetId())

	_, err = client.GetSurah(t.Context(), &quranpb.GetSurahRequest{SurahId: 200})
	require.Equal(t, codes.NotFound, status.Code(err))
}

func TestGRPCGetSurahRepositoryFailureIsInternal(t *testing.T) {
	svc := service.SurahService{SurahRepo: fakeSurahRepo{
		getFn: func(context.Context, int32) (domain.Surah, error) {
			return domain.Surah{}, errors.New("connection refused to db-host")
		},
	}}
	_, conn := startServer(t, svc, nil)

	_, err := quranpb.NewSurahServiceClient(conn).GetSurah(t.Context(), &quranpb.GetSurahRequest{SurahId: 1})

	require.Equal(t, codes.Internal, status.Code(err))
	require.NotContains(t, err.Error(), "db-host")
}

func TestGRPCListAyahs(t *testing.T) {
	_, conn := startServer(t, surahService(), nil)

	resp, err := quranpb.NewSurahServiceClient(conn).ListAyahs(t.Context(), &quranpb.ListAyahsRequest{SurahId: 2})

	require.NoError(t, err)
	require.Len(t, resp.GetAyahs(), 1)
	require.Equal(t, int32(2), resp.GetAyahs()[0].GetSurahId())
	require.Equal(t, "ٱلْحَمْدُ", resp.GetAyahs()[0].GetTextAr())
}

func TestGRPCGetAyah(t *testing.T) {
	_, conn := startServer(t, surahService(), nil)
	client := quranpb.NewSurahServiceClient(conn)

	resp, err := client.GetAyah(t.Context(), &quranpb.GetAyahRequest{SurahId: 3, AyahNumber: 1})
	require.NoError(t, err)
	require.Equal(t, int32(3), resp.GetAyah().GetSurahId())
	require.Nil(t, resp.GetAyah().GetMetadata())

	_, err = client.GetAyah(t.Context(), &quranpb.GetAyahRequest{SurahId: 3, AyahNumber: 2})
	require.Equal(t, codes.Internal, status.Code(err))

	_, err = client.GetAyah(t.Context(), &quranpb.GetAyahRequest{SurahId: 3, AyahNumber: 9})
	require.Equal(t, codes.NotFound, status.Code(err))
}

func TestGRPCHandlerPanicKeepsServerRunning(t *testing.T) {
	svc := surahService()
	healthy := svc.SurahRepo
	svc.SurahRepo = fakeSurahRepo{
		listFn: healthy.ListSurahs,
		getFn: func(context.Context, int32) (domain.Surah, error) {
			panic("boom")
		},
	}
	_, conn := startServer(t, svc, nil)
	client := quranpb.NewSurahServiceClient(conn)

	_, err := client.GetSurah(t.Context(), &quranpb.GetSurahRequest{SurahId: 1})
	require.Equal(t, codes.Internal, status.Code(err))
	require.NotContains(t, err.Error(), "boom")

	_, err = client.ListSurahs(t.Context(), &quranpb.ListSurahsRequest{})
	require.NoError(t, err)
}

func TestGRPCScoringNotConfigured(t *testing.T) {
	_, conn := startServer(t, surahService(), nil)
	client := quranpb.NewScoringServiceClient(conn)

	_, err := client.CreateScoringJob(t.Context(), &quranpb.CreateScoringJobRequest{})
	require.Equal(t, codes.Unimplemented, status.Code(err))

	_, err = client.GetScoringJob(t.Context(), &quranpb.GetScoringJobRequest{SessionId: "s"})
	require.Equal(t, codes.Unimplemented, status.Code(err))
}

func TestGRPCCreateScoringJobValidation(t *testing.T) {
	jobs := scoring.NewJobService(fakeAyahLookup{}, fakeScoringRepo{}, nil)
	_, conn := startServer(t, surahService(), jobs)
	client := quranpb.NewScoringServiceClient(conn)

	tests := map[string]*quranpb.CreateScoringJobRequest{
		"empty":              {},
		"missing ayah":       {UploadKey: "u", SurahId: 1},
		"missing surah":      {UploadKey: "u", AyahNumber: 1},
		"missing upload key": {SurahId: 1, AyahNumber: 1},
	}
	for name, req := range tests {
		t.Run(name, func(t *testing.T) {
			_, err := client.CreateScoringJob(t.Context(), req)
			require.Equal(t, codes.InvalidArgument, status.Code(err))
		})
	}
}

type fakeStore struct{ err error }

func (f fakeStore) Get(context.Context, string) (io.ReadCloser, error) {
	if f.err != nil {
		return nil, f.err
	}
	return io.NopCloser(strings.NewReader("audio")), nil
}

type fakeTranscriber struct {
	text string
	err  error
}

func (f fakeTranscriber) Transcribe(context.Context, transcribe.Request) (transcribe.Result, error) {
	return transcribe.Result{Transcript: f.text}, f.err
}

func scoringJobs(t *testing.T, store storage.ObjectStore, transcriber transcribe.Transcriber) *scoring.JobService {
	t.Helper()
	engine, err := scoring.NewEngine(store, transcriber)
	require.NoError(t, err)
	return scoring.NewJobService(
		fakeAyahLookup{fn: func(context.Context, int32, int32) (domain.Ayah, error) {
			return domain.Ayah{TextAr: "الحمد لله"}, nil
		}},
		fakeScoringRepo{
			startFn: func(context.Context, repo.StartScoringJobParams) (time.Time, error) {
				return time.Date(2026, 6, 1, 0, 0, 0, 0, time.UTC), nil
			},
			completeFn: func(context.Context, string, float64, json.RawMessage) error { return nil },
			markFn:     func(context.Context, string) error { return nil },
		},
		engine,
	)
}

func TestGRPCCreateScoringJob(t *testing.T) {
	jobs := scoringJobs(t, fakeStore{}, fakeTranscriber{text: "الحمد لله"})
	_, conn := startServer(t, surahService(), jobs)

	resp, err := quranpb.NewScoringServiceClient(conn).CreateScoringJob(t.Context(), &quranpb.CreateScoringJobRequest{
		SessionId: "sess-1", UploadKey: "uploads/rec.opus", SurahId: 1, AyahNumber: 2, UserId: "u-1",
	})

	require.NoError(t, err)
	job := resp.GetJob()
	require.Equal(t, "sess-1", job.GetSessionId())
	require.Equal(t, quranpb.ScoringStatus_SCORING_STATUS_COMPLETED, job.GetStatus())
	require.NotNil(t, job.Score)
	require.Equal(t, "الحمد لله", job.GetEvaluation().AsMap()["transcript"])
	require.NotNil(t, job.GetSegments())
	require.Empty(t, job.GetSegments().GetValues())
}

func TestGRPCCreateScoringJobErrorMapping(t *testing.T) {
	tests := []struct {
		name        string
		store       storage.ObjectStore
		transcriber transcribe.Transcriber
		want        codes.Code
	}{
		{"missing upload", fakeStore{err: storage.ErrObjectNotFound}, fakeTranscriber{}, codes.NotFound},
		{"no transcriber", fakeStore{}, fakeTranscriber{err: transcribe.ErrUnavailable}, codes.Unavailable},
		{"timeout", fakeStore{}, fakeTranscriber{err: context.DeadlineExceeded}, codes.DeadlineExceeded},
		{"canceled", fakeStore{}, fakeTranscriber{err: context.Canceled}, codes.Canceled},
		{"unknown", fakeStore{}, fakeTranscriber{err: errors.New("boom")}, codes.Internal},
	}
	for _, test := range tests {
		t.Run(test.name, func(t *testing.T) {
			_, conn := startServer(t, surahService(), scoringJobs(t, test.store, test.transcriber))

			_, err := quranpb.NewScoringServiceClient(conn).CreateScoringJob(t.Context(), &quranpb.CreateScoringJobRequest{
				SessionId: "sess-1", UploadKey: "u", SurahId: 1, AyahNumber: 1,
			})

			require.Equal(t, test.want, status.Code(err))
		})
	}
}

func TestGRPCCreateScoringJobAyahNotFound(t *testing.T) {
	jobs := scoring.NewJobService(fakeAyahLookup{
		fn: func(context.Context, int32, int32) (domain.Ayah, error) {
			return domain.Ayah{}, domain.ErrAyahNotFound
		},
	}, fakeScoringRepo{}, nil)
	_, conn := startServer(t, surahService(), jobs)

	_, err := quranpb.NewScoringServiceClient(conn).CreateScoringJob(t.Context(), &quranpb.CreateScoringJobRequest{
		UploadKey: "u", SurahId: 1, AyahNumber: 1,
	})

	require.Equal(t, codes.NotFound, status.Code(err))
}

func TestGRPCGetScoringJob(t *testing.T) {
	score := 0.9
	verdict := "good"
	jobs := scoring.NewJobService(fakeAyahLookup{}, fakeScoringRepo{
		getFn: func(_ context.Context, id string) (repo.ScoringJob, error) {
			switch id {
			case "sess-1":
				return repo.ScoringJob{
					SessionID:  id,
					UploadKey:  "uploads/rec.opus",
					Status:     "COMPLETED",
					Score:      &score,
					Verdict:    &verdict,
					Segments:   json.RawMessage(`[{"start":1}]`),
					Evaluation: json.RawMessage(`{"accuracy":0.9}`),
					CreatedAt:  time.Date(2026, 6, 1, 0, 0, 0, 0, time.UTC),
				}, nil
			case "running":
				return repo.ScoringJob{SessionID: id, Status: "RUNNING", Evaluation: json.RawMessage("null")}, nil
			case "broken":
				return repo.ScoringJob{SessionID: id, Status: "COMPLETED", Segments: json.RawMessage(`{`)}, nil
			case "unknown-status":
				return repo.ScoringJob{SessionID: id, Status: "PAUSED"}, nil
			case "db-down":
				return repo.ScoringJob{}, errors.New("db down")
			}
			return repo.ScoringJob{}, domain.ErrScoringJobNotFound
		},
	}, nil)
	_, conn := startServer(t, surahService(), jobs)
	client := quranpb.NewScoringServiceClient(conn)

	resp, err := client.GetScoringJob(t.Context(), &quranpb.GetScoringJobRequest{SessionId: "sess-1"})
	require.NoError(t, err)
	require.Equal(t, 0.9, resp.GetJob().GetScore())
	require.Equal(t, "good", resp.GetJob().GetVerdict())
	require.Len(t, resp.GetJob().GetSegments().GetValues(), 1)
	require.Equal(t, 0.9, resp.GetJob().GetEvaluation().AsMap()["accuracy"])
	require.Equal(t, 2026, resp.GetJob().GetCreateTime().AsTime().Year())

	running, err := client.GetScoringJob(t.Context(), &quranpb.GetScoringJobRequest{SessionId: "running"})
	require.NoError(t, err)
	require.Equal(t, quranpb.ScoringStatus_SCORING_STATUS_RUNNING, running.GetJob().GetStatus())
	require.Nil(t, running.GetJob().Score)
	require.Nil(t, running.GetJob().GetEvaluation())

	for id, want := range map[string]codes.Code{
		"":               codes.InvalidArgument,
		"missing":        codes.NotFound,
		"broken":         codes.Internal,
		"unknown-status": codes.Internal,
		"db-down":        codes.Internal,
	} {
		_, err := client.GetScoringJob(t.Context(), &quranpb.GetScoringJobRequest{SessionId: id})
		require.Equal(t, want, status.Code(err), "session %q", id)
	}
}

func TestMultiplexRoutesOnlyHTTP2GRPCRequests(t *testing.T) {
	tests := []struct {
		name        string
		protoMajor  int
		contentType string
		wantGRPC    bool
	}{
		{"http2 grpc", 2, "application/grpc", true},
		{"http2 grpc proto", 2, "application/grpc+proto", true},
		{"http2 json", 2, "application/json", false},
		{"http1 grpc", 1, "application/grpc", false},
	}
	for _, test := range tests {
		t.Run(test.name, func(t *testing.T) {
			var gotGRPC bool
			handler := Multiplex(
				http.HandlerFunc(func(http.ResponseWriter, *http.Request) { gotGRPC = true }),
				http.HandlerFunc(func(http.ResponseWriter, *http.Request) {}),
			)
			req := &http.Request{ProtoMajor: test.protoMajor, Header: http.Header{"Content-Type": {test.contentType}}}

			handler.ServeHTTP(nil, req)

			require.Equal(t, test.wantGRPC, gotGRPC)
		})
	}
}
