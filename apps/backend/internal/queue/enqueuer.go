package queue

import (
	"context"
	"fmt"
	"os"
	"sync"
	"time"

	"quran-project/apps/backend/internal/telemetry"
	"quran-project/packages/go-pkg/queue"

	"go.opentelemetry.io/otel"
	"go.opentelemetry.io/otel/attribute"
	"go.opentelemetry.io/otel/metric"
	"go.opentelemetry.io/otel/propagation"
)

// Enqueuer publishes ASR jobs to Redis so that the worker can consume them.
type Enqueuer struct {
	client    Client
	authToken string
}

var (
	enqueueMetricsOnce    sync.Once
	enqueueDurationMetric metric.Float64Histogram
)

// Client abstracts queue client behavior for testing.
type Client interface {
	Enqueue(ctx context.Context, job queue.Job) error
}

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
	return newEnqueuerWithClient(client, os.Getenv("QUEUE_AUTH_TOKEN")), nil
}

func newEnqueuerWithClient(client Client, authToken string) *Enqueuer {
	return &Enqueuer{
		client:    client,
		authToken: authToken,
	}
}

// PublishASRJob pushes a single job for the given session/audio/ayah combination.
// referenceAudioKey is optional and points to the cached teacher recitation in object storage;
// the worker uses it for per-word pronunciation alignment in Phase 2 and silently ignores it today.
func (e *Enqueuer) PublishASRJob(ctx context.Context, sessionID, audioKey string, ayahID int64, expectedTextAR, referenceAudioKey string) error {
	startedAt := time.Now()
	ctx, span := telemetry.Tracer().Start(ctx, "queue.enqueue")
	span.SetAttributes(
		attribute.String("session_id", sessionID),
		attribute.String("audio_key", audioKey),
		attribute.Int64("ayah_id", ayahID),
	)
	defer span.End()

	// Inject trace context into job
	traceContext := make(map[string]string)
	otel.GetTextMapPropagator().Inject(ctx, propagation.MapCarrier(traceContext))

	job := queue.Job{
		SessionID:         sessionID,
		AudioKey:          audioKey,
		AyahID:            ayahID,
		ExpectedTextAR:    expectedTextAR,
		ReferenceAudioKey: referenceAudioKey,
		EnqueuedAt:        time.Now().UTC(),
		AuthToken:         e.authToken,
		TraceContext:      traceContext,
	}
	err := e.client.Enqueue(ctx, job)
	enqueueDurationMs := float64(time.Since(startedAt).Milliseconds())
	if enqueueDurationMetric != nil {
		enqueueDurationMetric.Record(ctx, enqueueDurationMs, metric.WithAttributes(attribute.String("session_id", sessionID)))
	}
	if err != nil {
		return fmt.Errorf("enqueue: publish session_id=%s ayah_id=%d: %w", sessionID, ayahID, err)
	}
	return nil
}
