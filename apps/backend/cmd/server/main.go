package main

import (
	"context"
	"errors"
	"log"
	"net/http"
	"os"

	"quran-project/apps/backend/internal/handler"
	backendqueue "quran-project/apps/backend/internal/queue"
	"quran-project/apps/backend/internal/repo"
	"quran-project/apps/backend/internal/service"
	"quran-project/apps/backend/internal/telemetry"
	"quran-project/packages/go-pkg/db"
	queuepkg "quran-project/packages/go-pkg/queue"

	_ "github.com/jackc/pgx/v5/stdlib"
)

func main() {
	ctx := context.Background()
	if err := telemetry.Init(ctx); err != nil {
		log.Printf("telemetry init failed: %v", err)
	}

	repository := repo.NewInMemoryRepository()
	svc := service.SurahService{
		SurahRepo: repository,
		AyahRepo:  repository,
	}

	dbConn, err := db.Connect(ctx, db.Config{
		DSN:        os.Getenv("DATABASE_URL"),
		DriverName: "pgx",
	})
	if err != nil {
		log.Fatalf("db connect failed: %v", err)
	}

	queueName := os.Getenv("QUEUE_NAME")
	if queueName == "" {
		queueName = "quran:asr_jobs"
	}
	enqueuer, err := backendqueue.NewEnqueuer(queuepkg.Config{
		RedisURL:  os.Getenv("REDIS_URL"),
		QueueName: queueName,
	})
	if err != nil {
		log.Fatalf("queue init failed: %v", err)
	}

	mux := http.NewServeMux()
	rest := handler.REST{SurahService: svc, DB: dbConn, Enqueuer: enqueuer}
	rest.Register(mux)
	mux.Handle("/graphql", handler.GraphQLHandler{SurahService: svc})
	mux.HandleFunc("/healthz", func(w http.ResponseWriter, _ *http.Request) {
		w.WriteHeader(http.StatusOK)
		_, _ = w.Write([]byte("ok"))
	})

	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}

	server := &http.Server{
		Addr:    ":" + port,
		Handler: mux,
	}

	log.Printf("backend listening on %s", server.Addr)
	if err := server.ListenAndServe(); err != nil && !errors.Is(err, http.ErrServerClosed) {
		log.Fatal(err)
	}
}
