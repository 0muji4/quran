package telemetry

import (
	"context"
	"testing"

	"go.opentelemetry.io/otel"
	"go.opentelemetry.io/otel/sdk/metric"
	"go.opentelemetry.io/otel/sdk/metric/metricdata"
)

func TestInitMetrics(t *testing.T) {
	// Setup meter provider
	reader := metric.NewManualReader()
	mp := metric.NewMeterProvider(metric.WithReader(reader))
	otel.SetMeterProvider(mp)
	defer mp.Shutdown(context.Background())

	// Initialize metrics
	if err := InitMetrics(); err != nil {
		t.Fatalf("InitMetrics failed: %v", err)
	}

	// Verify metrics are initialized
	if sessionsCreatedCounter == nil {
		t.Error("expected sessionsCreatedCounter to be initialized")
	}
	if sessionsCompletedCounter == nil {
		t.Error("expected sessionsCompletedCounter to be initialized")
	}
}

func TestRecordSessionCreated(t *testing.T) {
	// Setup meter provider with manual reader
	reader := metric.NewManualReader()
	mp := metric.NewMeterProvider(metric.WithReader(reader))
	otel.SetMeterProvider(mp)
	defer mp.Shutdown(context.Background())

	// Initialize metrics
	if err := InitMetrics(); err != nil {
		t.Fatalf("InitMetrics failed: %v", err)
	}

	ctx := context.Background()

	// Record session created
	RecordSessionCreated(ctx, "user123")

	// Collect metrics
	var rm metricdata.ResourceMetrics
	if err := reader.Collect(ctx, &rm); err != nil {
		t.Fatalf("failed to collect metrics: %v", err)
	}

	// Verify metric was recorded
	found := false
	for _, sm := range rm.ScopeMetrics {
		for _, m := range sm.Metrics {
			if m.Name == "quran.sessions.created.total" {
				found = true
				if sum, ok := m.Data.(metricdata.Sum[int64]); ok {
					if len(sum.DataPoints) == 0 {
						t.Error("expected at least one data point")
					}
					// Verify value
					if sum.DataPoints[0].Value != 1 {
						t.Errorf("expected value=1, got %d", sum.DataPoints[0].Value)
					}
				} else {
					t.Error("expected Sum data type")
				}
			}
		}
	}
	if !found {
		t.Error("expected to find quran.sessions.created.total metric")
	}
}

func TestRecordSessionCompleted(t *testing.T) {
	reader := metric.NewManualReader()
	mp := metric.NewMeterProvider(metric.WithReader(reader))
	otel.SetMeterProvider(mp)
	defer mp.Shutdown(context.Background())

	if err := InitMetrics(); err != nil {
		t.Fatalf("InitMetrics failed: %v", err)
	}

	ctx := context.Background()
	RecordSessionCompleted(ctx, "user123", 0.95)

	var rm metricdata.ResourceMetrics
	if err := reader.Collect(ctx, &rm); err != nil {
		t.Fatalf("failed to collect metrics: %v", err)
	}

	found := false
	for _, sm := range rm.ScopeMetrics {
		for _, m := range sm.Metrics {
			if m.Name == "quran.sessions.completed.total" {
				found = true
			}
		}
	}
	if !found {
		t.Error("expected to find quran.sessions.completed.total metric")
	}
}

func TestRecordMetricsWithNilCounters(t *testing.T) {
	// Reset counters to nil
	sessionsCreatedCounter = nil
	sessionsCompletedCounter = nil

	ctx := context.Background()

	// These should not panic
	RecordSessionCreated(ctx, "user123")
	RecordSessionCompleted(ctx, "user123", 0.95)
}
