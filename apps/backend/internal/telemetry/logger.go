package telemetry

import (
	"context"
	"log/slog"
	"os"

	"go.opentelemetry.io/otel/trace"
)

var logger *slog.Logger

// InitLogger initializes the structured logger with OTEL context injection.
func InitLogger() {
	logLevel := os.Getenv("LOG_LEVEL")
	logFormat := os.Getenv("LOG_FORMAT")

	var level slog.Level
	switch logLevel {
	case "DEBUG":
		level = slog.LevelDebug
	case "WARN":
		level = slog.LevelWarn
	case "ERROR":
		level = slog.LevelError
	default:
		level = slog.LevelInfo
	}

	var handler slog.Handler
	if logFormat == "json" {
		handler = slog.NewJSONHandler(os.Stdout, &slog.HandlerOptions{
			Level: level,
		})
	} else {
		handler = slog.NewTextHandler(os.Stdout, &slog.HandlerOptions{
			Level: level,
		})
	}

	// Wrap handler to inject OTEL context
	handler = &otelContextHandler{Handler: handler}

	logger = slog.New(handler)
	slog.SetDefault(logger)
}

// Logger returns the global logger.
func Logger() *slog.Logger {
	if logger == nil {
		InitLogger()
	}
	return logger
}

// otelContextHandler wraps slog.Handler to inject trace/span IDs from context.
type otelContextHandler struct {
	slog.Handler
}

func (h *otelContextHandler) Handle(ctx context.Context, r slog.Record) error {
	// Extract trace context
	spanCtx := trace.SpanContextFromContext(ctx)
	if spanCtx.IsValid() {
		r.AddAttrs(
			slog.String("trace_id", spanCtx.TraceID().String()),
			slog.String("span_id", spanCtx.SpanID().String()),
		)
	}

	return h.Handler.Handle(ctx, r)
}

func (h *otelContextHandler) WithAttrs(attrs []slog.Attr) slog.Handler {
	return &otelContextHandler{Handler: h.Handler.WithAttrs(attrs)}
}

func (h *otelContextHandler) WithGroup(name string) slog.Handler {
	return &otelContextHandler{Handler: h.Handler.WithGroup(name)}
}
