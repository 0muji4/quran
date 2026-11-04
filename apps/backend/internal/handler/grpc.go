package handler

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"net/http"
	"runtime/debug"
	"strings"
	"time"

	"go.opentelemetry.io/contrib/instrumentation/google.golang.org/grpc/otelgrpc"
	"google.golang.org/grpc"
	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/status"
	"google.golang.org/protobuf/types/known/structpb"
	"google.golang.org/protobuf/types/known/timestamppb"

	"quran-project/apps/backend/internal/domain"
	quranpb "quran-project/apps/backend/internal/gen/quran/v1"
	"quran-project/apps/backend/internal/repo"
	"quran-project/apps/backend/internal/scoring"
	"quran-project/apps/backend/internal/service"
	"quran-project/apps/backend/internal/storage"
	"quran-project/apps/backend/internal/telemetry"
	"quran-project/apps/backend/internal/transcribe"
)

// NewGRPCServer builds the gRPC server. jobs is nil when scoring is not configured.
func NewGRPCServer(surahs service.SurahService, jobs *scoring.JobService) *grpc.Server {
	server := grpc.NewServer(
		grpc.StatsHandler(otelgrpc.NewServerHandler()),
		grpc.ChainUnaryInterceptor(logUnary, recoverUnary),
	)
	quranpb.RegisterSurahServiceServer(server, surahServer{surahs: surahs})
	if jobs != nil {
		quranpb.RegisterScoringServiceServer(server, scoringServer{jobs: jobs})
	}
	return server
}

// logUnary logs each call with its status code and duration.
func logUnary(ctx context.Context, req any, info *grpc.UnaryServerInfo, next grpc.UnaryHandler) (any, error) {
	start := time.Now()
	resp, err := next(ctx, req)
	telemetry.Logger().InfoContext(ctx, "gRPC request",
		"method", info.FullMethod,
		"code", status.Code(err).String(),
		"duration_ms", time.Since(start).Milliseconds(),
	)
	return resp, err
}

// recoverUnary converts a handler panic into an INTERNAL status.
func recoverUnary(ctx context.Context, req any, info *grpc.UnaryServerInfo, next grpc.UnaryHandler) (resp any, err error) {
	defer func() {
		if r := recover(); r != nil {
			telemetry.Logger().ErrorContext(ctx, "gRPC handler panicked",
				"method", info.FullMethod,
				"panic", r,
				"stack", string(debug.Stack()),
			)
			err = status.Error(codes.Internal, "internal error")
		}
	}()
	return next(ctx, req)
}

// Multiplex sends gRPC requests to grpcHandler and all other requests to next.
func Multiplex(grpcHandler, next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.ProtoMajor == 2 && strings.HasPrefix(r.Header.Get("Content-Type"), "application/grpc") {
			grpcHandler.ServeHTTP(w, r)
			return
		}
		next.ServeHTTP(w, r)
	})
}

type surahServer struct {
	quranpb.UnimplementedSurahServiceServer
	surahs service.SurahService
}

func (s surahServer) ListSurahs(ctx context.Context, _ *quranpb.ListSurahsRequest) (*quranpb.ListSurahsResponse, error) {
	surahs, err := s.surahs.ListSurahs(ctx)
	if err != nil {
		return nil, internalError(ctx, "failed to list surahs", err)
	}

	out := make([]*quranpb.Surah, len(surahs))
	for i, surah := range surahs {
		if out[i], err = toProtoSurah(surah); err != nil {
			return nil, internalError(ctx, "failed to encode surah", err)
		}
	}
	return &quranpb.ListSurahsResponse{Surahs: out}, nil
}

func (s surahServer) GetSurah(ctx context.Context, req *quranpb.GetSurahRequest) (*quranpb.GetSurahResponse, error) {
	surah, err := s.surahs.GetSurah(ctx, req.GetSurahId())
	if errors.Is(err, domain.ErrSurahNotFound) {
		return nil, status.Error(codes.NotFound, "surah not found")
	}
	if err != nil {
		return nil, internalError(ctx, "failed to load surah", err)
	}

	out, err := toProtoSurah(surah)
	if err != nil {
		return nil, internalError(ctx, "failed to encode surah", err)
	}
	return &quranpb.GetSurahResponse{Surah: out}, nil
}

func (s surahServer) ListAyahs(ctx context.Context, req *quranpb.ListAyahsRequest) (*quranpb.ListAyahsResponse, error) {
	ayahs, err := s.surahs.ListAyahs(ctx, req.GetSurahId())
	if err != nil {
		return nil, internalError(ctx, "failed to list ayahs", err)
	}

	out := make([]*quranpb.Ayah, len(ayahs))
	for i, ayah := range ayahs {
		if out[i], err = toProtoAyah(ayah); err != nil {
			return nil, internalError(ctx, "failed to encode ayah", err)
		}
	}
	return &quranpb.ListAyahsResponse{Ayahs: out}, nil
}

func (s surahServer) GetAyah(ctx context.Context, req *quranpb.GetAyahRequest) (*quranpb.GetAyahResponse, error) {
	ayah, err := s.surahs.GetAyahByNumber(ctx, req.GetSurahId(), req.GetAyahNumber())
	if errors.Is(err, domain.ErrAyahNotFound) {
		return nil, status.Error(codes.NotFound, "ayah not found")
	}
	if err != nil {
		return nil, internalError(ctx, "failed to load ayah", err)
	}

	out, err := toProtoAyah(ayah)
	if err != nil {
		return nil, internalError(ctx, "failed to encode ayah", err)
	}
	return &quranpb.GetAyahResponse{Ayah: out}, nil
}

type scoringServer struct {
	quranpb.UnimplementedScoringServiceServer
	jobs *scoring.JobService
}

func (s scoringServer) CreateScoringJob(ctx context.Context, req *quranpb.CreateScoringJobRequest) (*quranpb.CreateScoringJobResponse, error) {
	if req.GetUploadKey() == "" || req.GetSurahId() == 0 || req.GetAyahNumber() == 0 {
		return nil, status.Error(codes.InvalidArgument, "upload_key, surah_id, and ayah_number are required")
	}

	result, err := s.jobs.Create(ctx, scoring.JobInput{
		SessionID:         req.GetSessionId(),
		UploadKey:         req.GetUploadKey(),
		SurahID:           req.GetSurahId(),
		AyahNumber:        req.GetAyahNumber(),
		UserID:            req.GetUserId(),
		ReferenceAudioKey: req.GetReferenceAudioKey(),
	})
	if err != nil {
		return nil, scoringError(ctx, err)
	}

	telemetry.RecordSessionCompleted(ctx, req.GetUserId(), result.Score)

	evaluation, err := json.Marshal(result.Evaluation)
	if err != nil {
		return nil, internalError(ctx, "failed to encode evaluation", err)
	}

	job, err := toProtoScoringJob(repo.ScoringJob{
		SessionID:  result.SessionID,
		UploadKey:  result.UploadKey,
		Status:     "COMPLETED",
		Score:      &result.Score,
		Evaluation: evaluation,
		CreatedAt:  result.CreatedAt,
	})
	if err != nil {
		return nil, internalError(ctx, "failed to encode scoring job", err)
	}
	return &quranpb.CreateScoringJobResponse{Job: job}, nil
}

func (s scoringServer) GetScoringJob(ctx context.Context, req *quranpb.GetScoringJobRequest) (*quranpb.GetScoringJobResponse, error) {
	if req.GetSessionId() == "" {
		return nil, status.Error(codes.InvalidArgument, "session_id is required")
	}

	stored, err := s.jobs.Get(ctx, req.GetSessionId())
	if errors.Is(err, domain.ErrScoringJobNotFound) {
		return nil, status.Error(codes.NotFound, "scoring job not found")
	}
	if err != nil {
		return nil, internalError(ctx, "failed to load scoring job", err)
	}

	job, err := toProtoScoringJob(stored)
	if err != nil {
		return nil, internalError(ctx, "failed to encode scoring job", err)
	}
	return &quranpb.GetScoringJobResponse{Job: job}, nil
}

// scoringFailure is a known JobService.Create error and its status per transport.
type scoringFailure struct {
	err        error
	httpStatus int
	grpcCode   codes.Code
	message    string
}

var scoringFailures = []scoringFailure{
	{domain.ErrAyahNotFound, http.StatusNotFound, codes.NotFound, "ayah not found"},
	{storage.ErrObjectNotFound, http.StatusNotFound, codes.NotFound, "audio upload not found"},
	{transcribe.ErrUnavailable, http.StatusServiceUnavailable, codes.Unavailable, "transcriber not configured (CHIRP_PROJECT)"},
}

// findScoringFailure returns the known failure matching err, if any.
func findScoringFailure(err error) (scoringFailure, bool) {
	for _, failure := range scoringFailures {
		if errors.Is(err, failure.err) {
			return failure, true
		}
	}
	return scoringFailure{}, false
}

// scoringError maps a JobService.Create failure to a gRPC status.
func scoringError(ctx context.Context, err error) error {
	if failure, ok := findScoringFailure(err); ok {
		return status.Error(failure.grpcCode, failure.message)
	}
	switch {
	case errors.Is(err, context.DeadlineExceeded):
		return status.Error(codes.DeadlineExceeded, "scoring timed out")
	case errors.Is(err, context.Canceled):
		return status.Error(codes.Canceled, "scoring canceled")
	default:
		return internalError(ctx, "failed to score recitation", err)
	}
}

// internalError logs err and returns a sanitized INTERNAL status.
func internalError(ctx context.Context, msg string, err error) error {
	telemetry.Logger().ErrorContext(ctx, msg, "error", err)
	return status.Error(codes.Internal, msg)
}

func toProtoSurah(s domain.Surah) (*quranpb.Surah, error) {
	metadata, err := toProtoStruct(s.Metadata)
	if err != nil {
		return nil, err
	}
	return &quranpb.Surah{
		Id:              s.ID,
		NameAr:          s.NameAr,
		NameEn:          s.NameEn,
		RevelationPlace: s.RevelationPlace,
		AyahCount:       s.AyahCount,
		Metadata:        metadata,
		CreateTime:      toProtoTime(s.CreatedAt),
		UpdateTime:      toProtoTime(s.UpdatedAt),
	}, nil
}

func toProtoAyah(a domain.Ayah) (*quranpb.Ayah, error) {
	metadata, err := toProtoStruct(a.Metadata)
	if err != nil {
		return nil, err
	}
	return &quranpb.Ayah{
		Id:              a.ID,
		SurahId:         a.SurahID,
		AyahNumber:      a.AyahNumber,
		TextAr:          a.TextAr,
		TextEn:          a.TextEn,
		Transliteration: a.Transliteration,
		Metadata:        metadata,
		CreateTime:      toProtoTime(a.CreatedAt),
		UpdateTime:      toProtoTime(a.UpdatedAt),
	}, nil
}

func toProtoScoringJob(j repo.ScoringJob) (*quranpb.ScoringJob, error) {
	jobStatus, ok := quranpb.ScoringStatus_value["SCORING_STATUS_"+j.Status]
	if !ok {
		return nil, fmt.Errorf("unknown scoring status %q", j.Status)
	}

	segments := &structpb.ListValue{}
	if len(j.Segments) > 0 {
		if err := segments.UnmarshalJSON(j.Segments); err != nil {
			return nil, err
		}
	}

	var evaluation *structpb.Struct
	if len(j.Evaluation) > 0 && string(j.Evaluation) != "null" {
		evaluation = &structpb.Struct{}
		if err := evaluation.UnmarshalJSON(j.Evaluation); err != nil {
			return nil, err
		}
	}

	return &quranpb.ScoringJob{
		SessionId:  j.SessionID,
		UploadKey:  j.UploadKey,
		Status:     quranpb.ScoringStatus(jobStatus),
		Score:      j.Score,
		Segments:   segments,
		Verdict:    j.Verdict,
		Evaluation: evaluation,
		CreateTime: toProtoTime(j.CreatedAt),
	}, nil
}

func toProtoStruct(m map[string]any) (*structpb.Struct, error) {
	if len(m) == 0 {
		return nil, nil
	}
	return structpb.NewStruct(m)
}

func toProtoTime(t time.Time) *timestamppb.Timestamp {
	if t.IsZero() {
		return nil
	}
	return timestamppb.New(t)
}
