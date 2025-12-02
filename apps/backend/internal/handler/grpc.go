package handler

import (
	"context"
	"errors"

	"quran-project/apps/backend/internal/domain"
	"quran-project/apps/backend/internal/service"
)

// SurahGRPCServer is a small, framework-agnostic placeholder to be wrapped by a future protoc-generated server.
type SurahGRPCServer struct {
	svc service.SurahService
}

// NewSurahGRPCServer wires the surah service for gRPC adapters.
func NewSurahGRPCServer(svc service.SurahService) *SurahGRPCServer {
	return &SurahGRPCServer{svc: svc}
}

// GetSurahRequest mirrors a proto-generated request for a single surah.
type GetSurahRequest struct {
	SurahId int32
}

// GetSurahResponse mirrors a proto-generated response.
type GetSurahResponse struct {
	Surah domain.Surah
}

// ListAyahsRequest fetches ayahs for a surah.
type ListAyahsRequest struct {
	SurahId int32
}

// ListAyahsResponse wraps ayah results.
type ListAyahsResponse struct {
	Ayahs []domain.Ayah
}

// GetSurah provides a unary-style method signature similar to a generated gRPC server.
func (s *SurahGRPCServer) GetSurah(ctx context.Context, req *GetSurahRequest) (*GetSurahResponse, error) {
	if req == nil {
		return nil, errors.New("request required")
	}
	surah, err := s.svc.GetSurah(ctx, req.SurahId)
	if err != nil {
		return nil, err
	}
	return &GetSurahResponse{Surah: surah}, nil
}

// ListAyahs returns ayahs for a surah.
func (s *SurahGRPCServer) ListAyahs(ctx context.Context, req *ListAyahsRequest) (*ListAyahsResponse, error) {
	if req == nil {
		return nil, errors.New("request required")
	}
	ayahs, err := s.svc.ListAyahs(ctx, req.SurahId)
	if err != nil {
		return nil, err
	}
	return &ListAyahsResponse{Ayahs: ayahs}, nil
}
