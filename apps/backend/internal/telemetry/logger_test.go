package telemetry

import (
	"bytes"
	"context"
	"encoding/json"
	"log/slog"
	"testing"

	"go.opentelemetry.io/otel"
	sdktrace "go.opentelemetry.io/otel/sdk/trace"
)

func TestLoggerContextInjection(t *testing.T) {
	// Setup tracer provider
	tp := sdktrace.NewTracerProvider(
		sdktrace.WithSampler(sdktrace.AlwaysSample()),
	)
	otel.SetTracerProvider(tp)
	defer tp.Shutdown(context.Background())

	// Create a buffer to capture log output
	var buf bytes.Buffer
	handler := &otelContextHandler{
		Handler: slog.NewJSONHandler(&buf, &slog.HandlerOptions{}),
	}
	logger := slog.New(handler)

	// Create a span context
	ctx, span := tp.Tracer("test").Start(context.Background(), "test-span")
	defer span.End()

	// Log with context
	logger.InfoContext(ctx, "test message", "key", "value")

	// Parse the logged JSON
	var logEntry map[string]interface{}
	if err := json.Unmarshal(buf.Bytes(), &logEntry); err != nil {
		t.Fatalf("failed to parse log output: %v", err)
	}

	// Verify trace_id and span_id are present
	if _, ok := logEntry["trace_id"]; !ok {
		t.Error("expected trace_id in log output")
	}
	if _, ok := logEntry["span_id"]; !ok {
		t.Error("expected span_id in log output")
	}
	if logEntry["msg"] != "test message" {
		t.Errorf("expected msg='test message', got %v", logEntry["msg"])
	}
	if logEntry["key"] != "value" {
		t.Errorf("expected key='value', got %v", logEntry["key"])
	}
}

func TestLoggerWithoutContext(t *testing.T) {
	var buf bytes.Buffer
	handler := &otelContextHandler{
		Handler: slog.NewJSONHandler(&buf, &slog.HandlerOptions{}),
	}
	logger := slog.New(handler)

	// Log without span context
	ctx := context.Background()
	logger.InfoContext(ctx, "test message")

	var logEntry map[string]interface{}
	if err := json.Unmarshal(buf.Bytes(), &logEntry); err != nil {
		t.Fatalf("failed to parse log output: %v", err)
	}

	// trace_id and span_id should not be present without a span
	if _, ok := logEntry["trace_id"]; ok {
		t.Error("did not expect trace_id without span context")
	}
	if _, ok := logEntry["span_id"]; ok {
		t.Error("did not expect span_id without span context")
	}
}

func TestInitLogger(t *testing.T) {
	// Test that InitLogger doesn't panic
	t.Setenv("LOG_LEVEL", "DEBUG")
	t.Setenv("LOG_FORMAT", "json")

	InitLogger()

	logger := Logger()
	if logger == nil {
		t.Fatal("expected logger to be initialized")
	}
}
