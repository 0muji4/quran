package main

import (
	"context"
	"errors"
	"log"
	"net/http"
	"os"
	"strconv"

	"quran-project/apps/backend/internal/handler"
	"quran-project/apps/backend/internal/middleware"
	"quran-project/apps/backend/internal/repo"
	"quran-project/apps/backend/internal/scoring"
	"quran-project/apps/backend/internal/service"
	"quran-project/apps/backend/internal/storage"
	"quran-project/apps/backend/internal/telemetry"
	"quran-project/apps/backend/internal/transcribe"
	"quran-project/packages/go-pkg/db"

	_ "github.com/jackc/pgx/v5/stdlib"
)

func main() {
	ctx := context.Background()

	// Initialize telemetry (OTEL + logger + metrics)
	if err := telemetry.Init(ctx); err != nil {
		log.Printf("telemetry init failed: %v", err)
	}
	telemetry.InitLogger()
	if err := telemetry.InitMetrics(); err != nil {
		log.Printf("metrics init failed: %v", err)
	}
	if err := middleware.Init(); err != nil {
		log.Printf("middleware init failed: %v", err)
	}

	logger := telemetry.Logger()
	logger.Info("Starting quran-backend service")

	dbConn, err := db.Connect(ctx, db.Config{
		DSN:        os.Getenv("DATABASE_URL"),
		DriverName: "pgx",
	})
	if err != nil {
		log.Fatalf("db connect failed: %v", err)
	}

	repository := repo.NewPostgresRepository(dbConn)
	svc := service.SurahService{
		SurahRepo: repository,
		AyahRepo:  repository,
	}

	store, err := newObjectStore(ctx, logger)
	if err != nil {
		log.Fatalf("object storage init failed: %v", err)
	}

	transcriber, err := newTranscriber(ctx)
	if err != nil {
		log.Fatalf("transcriber init failed: %v", err)
	}

	engine, err := scoring.NewEngine(store, transcriber)
	if err != nil {
		log.Fatalf("scoring engine init failed: %v", err)
	}

	mux := http.NewServeMux()
	rest := handler.REST{SurahService: svc, DB: dbConn, ScoringEngine: engine}
	rest.Register(mux)
	mux.Handle("/graphql", handler.GraphQLHandler{SurahService: svc})
	mux.HandleFunc("/healthz", func(w http.ResponseWriter, _ *http.Request) {
		w.WriteHeader(http.StatusOK)
		_, _ = w.Write([]byte("ok"))
	})

	// Prometheus metrics endpoint
	mux.HandleFunc("/metrics", func(w http.ResponseWriter, _ *http.Request) {
		w.WriteHeader(http.StatusOK)
		_, _ = w.Write([]byte("# Metrics exported via OTEL\n"))
	})

	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}

	// Wrap mux with OTEL middleware. Use a local name that does not
	// shadow the imported `handler` package.
	rootHandler := middleware.OTEL(mux)

	server := &http.Server{
		Addr:    ":" + port,
		Handler: rootHandler,
	}

	logger.Info("backend listening", "addr", server.Addr)
	if err := server.ListenAndServe(); err != nil && !errors.Is(err, http.ErrServerClosed) {
		log.Fatal(err)
	}
}

// newObjectStore wires the S3-compatible object store from env. The local
// dev defaults match docker-compose.dev.yml so a developer can `make
// dev-up` without setting anything.
func newObjectStore(ctx context.Context, logger interface {
	Info(msg string, args ...any)
}) (*storage.MinIOStore, error) {
	cfg := storage.Config{
		Endpoint:  envOr("OBJECT_STORE_ENDPOINT", "minio:9000"),
		AccessKey: envOr("OBJECT_STORE_ACCESS_KEY", "minio"),
		SecretKey: envOr("OBJECT_STORE_SECRET_KEY", "minio123"),
		UseSSL:    envBool("OBJECT_STORE_USE_SSL", false),
		Bucket:    envOr("OBJECT_STORE_BUCKET", "uploads"),
		Region:    os.Getenv("OBJECT_STORE_REGION"),
	}
	store, err := storage.NewMinIOStore(cfg)
	if err != nil {
		return nil, err
	}
	if envBool("OBJECT_STORE_ENSURE_BUCKET", false) {
		if err := store.EnsureBucket(ctx); err != nil {
			return nil, err
		}
		logger.Info("object storage bucket ensured", "bucket", cfg.Bucket)
	}
	return store, nil
}

// newTranscriber wires the Chirp 2 transcriber. CHIRP_PROJECT is required;
// returning the error rather than substituting a stub makes the failure
// loud in environments where speech recognition is meant to be configured
// (notably any deploy that handles a real Android upload).
func newTranscriber(ctx context.Context) (*transcribe.ChirpTranscriber, error) {
	cfg := transcribe.ChirpConfig{
		Project:      os.Getenv("CHIRP_PROJECT"),
		Location:     os.Getenv("CHIRP_LOCATION"),
		LanguageCode: os.Getenv("CHIRP_LANGUAGE_CODE"),
		Model:        os.Getenv("CHIRP_MODEL"),
	}
	if cfg.Project == "" {
		return nil, errors.New("CHIRP_PROJECT env var is required")
	}
	return transcribe.NewChirpTranscriber(ctx, cfg)
}

func envOr(key, fallback string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return fallback
}

func envBool(key string, fallback bool) bool {
	raw := os.Getenv(key)
	if raw == "" {
		return fallback
	}
	v, err := strconv.ParseBool(raw)
	if err != nil {
		return fallback
	}
	return v
}
