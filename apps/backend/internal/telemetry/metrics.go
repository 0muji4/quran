package telemetry

import (
	"context"
	"fmt"

	"go.opentelemetry.io/otel/attribute"
	"go.opentelemetry.io/otel/metric"
)

var (
	sessionsCreatedCounter   metric.Int64Counter
	sessionsCompletedCounter metric.Int64Counter
	queueDepthGauge          metric.Int64ObservableGauge
	dbQueryDuration          metric.Float64Histogram
)

// InitMetrics initializes custom business metrics.
func InitMetrics() error {
	meter := Meter()

	var err error

	// Session metrics
	sessionsCreatedCounter, err = meter.Int64Counter(
		"quran.sessions.created.total",
		metric.WithDescription("Total number of pronunciation sessions created"),
	)
	if err != nil {
		return err
	}

	sessionsCompletedCounter, err = meter.Int64Counter(
		"quran.sessions.completed.total",
		metric.WithDescription("Total number of pronunciation sessions completed"),
	)
	if err != nil {
		return err
	}

	// DB Query Duration
	dbQueryDuration, err = meter.Float64Histogram(
		"db.query.duration",
		metric.WithDescription("Database query duration in milliseconds"),
		metric.WithUnit("ms"),
	)
	if err != nil {
		return fmt.Errorf("failed to create db.query.duration histogram: %w", err)
	}

	return nil
}

// RecordSessionCreated increments the session created counter.
func RecordSessionCreated(ctx context.Context, userID string) {
	if sessionsCreatedCounter != nil {
		sessionsCreatedCounter.Add(ctx, 1,
			metric.WithAttributes(
				attribute.String("user_id", userID),
			),
		)
	}
}

// RecordSessionCompleted increments the session completed counter.
func RecordSessionCompleted(ctx context.Context, userID string, score float64) {
	if sessionsCompletedCounter != nil {
		sessionsCompletedCounter.Add(ctx, 1,
			metric.WithAttributes(
				attribute.String("user_id", userID),
				attribute.Float64("score", score),
			),
		)
	}
}

// DBQueryDuration returns the database query duration histogram.
func DBQueryDuration() metric.Float64Histogram {
	return dbQueryDuration
}
