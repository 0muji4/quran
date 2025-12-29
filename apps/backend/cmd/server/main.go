package main

import (
	"context"
	"errors"
	"log"
	"net/http"
	"os"

	"quran-project/apps/backend/internal/handler"
	"quran-project/apps/backend/internal/repo"
	"quran-project/apps/backend/internal/service"
	"quran-project/apps/backend/internal/telemetry"
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

	mux := http.NewServeMux()
	rest := handler.REST{SurahService: svc}
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
