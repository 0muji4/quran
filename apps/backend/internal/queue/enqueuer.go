package queue

import (
	"context"
	"fmt"
	"log"
	"os"
	"sync"
	"time"

	"quran-project/apps/backend/internal/telemetry"
	"quran-project/packages/go-pkg/queue"

	"go.opentelemetry.io/otel/attribute"
	"go.opentelemetry.io/otel/metric"
)

// Enqueuer publishes ASR jobs to Redis so that the worker can consume them.
type Enqueuer struct {
	client    *queue.Client
	authToken string
}

var (
	enqueueMetricsOnce    sync.Once
	enqueueDurationMetric metric.Float64Histogram
)

// NewEnqueuer constructs an Enqueuer with the provided queue configuration.
func NewEnqueuer(cfg queue.Config) (*Enqueuer, error) {
	_ = telemetry.Init(context.Background())
	enqueueMetricsOnce.Do(func() {
		enqueueDurationMetric, _ = telemetry.Meter().Float64Histogram(
			"backend.queue.enqueue.duration",
			metric.WithDescription("Duration of enqueue operations"),
			metric.WithUnit("ms"),
		)
	})
	client, err := queue.NewClient(cfg)
	if err != nil {
		return nil, fmt.Errorf("enqueue: build client: %w", err)
	}
	return &Enqueuer{
		client:    client,
		authToken: os.Getenv("QUEUE_AUTH_TOKEN"),
	}, nil
}

// PublishASRJob pushes a single job for the given session/audio/ayah combination.
func (e *Enqueuer) PublishASRJob(ctx context.Context, sessionID, audioKey string, ayahID int64, expectedTextAR string) error {
	startedAt := time.Now()
	ctx, span := telemetry.Tracer().Start(ctx, "queue.enqueue")
	span.SetAttributes(
		attribute.String("session_id", sessionID),
		attribute.String("audio_key", audioKey),
		attribute.Int64("ayah_id", ayahID),
	)
	defer span.End()

	job := queue.Job{
		SessionID:      sessionID,
		AudioKey:       audioKey,
		AyahID:         ayahID,
		ExpectedTextAR: expectedTextAR,
		EnqueuedAt:     time.Now().UTC(),
		AuthToken:      e.authToken,
	}
	err := e.client.Enqueue(ctx, job)
	enqueueDurationMs := float64(time.Since(startedAt).Milliseconds())
	enqueueDurationMetric.Record(ctx, enqueueDurationMs, metric.WithAttributes(attribute.String("session_id", sessionID)))
	if err != nil {
		log.Printf("enqueue failed session_id=%s ayah_id=%d err=%v", sessionID, ayahID, err)
		return err
	}
	log.Printf("enqueued job session_id=%s ayah_id=%d", sessionID, ayahID)
	return nil
}
