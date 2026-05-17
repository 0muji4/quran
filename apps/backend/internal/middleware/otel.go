package middleware

import (
	"bufio"
	"fmt"
	"log/slog"
	"net"
	"net/http"
	"sync"
	"time"

	"quran-project/apps/backend/internal/telemetry"

	"go.opentelemetry.io/otel"
	"go.opentelemetry.io/otel/attribute"
	"go.opentelemetry.io/otel/metric"
	"go.opentelemetry.io/otel/propagation"
	"go.opentelemetry.io/otel/trace"
)

var (
	tracer trace.Tracer
	meter  metric.Meter

	httpServerDuration metric.Float64Histogram
	httpServerRequests metric.Int64Counter

	initOnce sync.Once
)

// Init binds the package-level tracer and meter to the current global
// providers and registers HTTP server instruments. It is safe to call
// repeatedly; only the first invocation has effect. Returns an error
// when an instrument cannot be registered so the caller decides how to
// surface the failure rather than panicking from an init function.
func Init() error {
	var initErr error
	initOnce.Do(func() {
		tracer = telemetry.Tracer()
		meter = telemetry.Meter()

		var err error
		httpServerDuration, err = meter.Float64Histogram(
			"http.server.duration",
			metric.WithDescription("HTTP server request duration in milliseconds"),
			metric.WithUnit("ms"),
		)
		if err != nil {
			initErr = fmt.Errorf("middleware: register http.server.duration: %w", err)
			return
		}

		httpServerRequests, err = meter.Int64Counter(
			"http.server.requests.total",
			metric.WithDescription("Total HTTP server requests"),
		)
		if err != nil {
			initErr = fmt.Errorf("middleware: register http.server.requests.total: %w", err)
			return
		}
	})
	return initErr
}

// OTEL wraps an HTTP handler with OpenTelemetry instrumentation.
// It lazily binds to the global tracer/meter providers via Init the
// first time it is called, so tests that do not call Init explicitly
// still get a working middleware.
func OTEL(next http.Handler) http.Handler {
	_ = Init()
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		start := time.Now()

		// Extract W3C Trace Context from incoming request
		ctx := otel.GetTextMapPropagator().Extract(r.Context(), propagation.HeaderCarrier(r.Header))

		// Start span
		spanName := r.Method + " " + r.URL.Path
		ctx, span := tracer.Start(ctx, spanName,
			trace.WithSpanKind(trace.SpanKindServer),
			trace.WithAttributes(
				attribute.String("http.method", r.Method),
				attribute.String("http.url", r.URL.String()),
				attribute.String("http.scheme", r.URL.Scheme),
				attribute.String("http.target", r.URL.Path),
				attribute.String("http.host", r.Host),
				attribute.String("http.user_agent", r.UserAgent()),
			),
		)
		defer span.End()

		// Wrap response writer to capture status code
		rw := &responseWriter{ResponseWriter: w, statusCode: http.StatusOK}

		// Call next handler
		next.ServeHTTP(rw, r.WithContext(ctx))

		// Record duration and status
		duration := time.Since(start).Milliseconds()
		statusCode := rw.statusCode

		// Set span attributes
		span.SetAttributes(
			attribute.Int("http.status_code", statusCode),
			attribute.Int64("http.response_content_length", rw.written),
		)

		// Mark span as error if status >= 500
		if statusCode >= 500 {
			span.SetAttributes(attribute.Bool("error", true))
		}

		// Record metrics
		attrs := metric.WithAttributes(
			attribute.String("http.method", r.Method),
			attribute.String("http.route", r.URL.Path),
			attribute.Int("http.status_code", statusCode),
		)

		httpServerDuration.Record(ctx, float64(duration), attrs)
		httpServerRequests.Add(ctx, 1, attrs)

		// Log request
		logger := telemetry.Logger()
		logger.InfoContext(ctx, "HTTP request",
			slog.String("method", r.Method),
			slog.String("path", r.URL.Path),
			slog.Int("status", statusCode),
			slog.Int64("duration_ms", duration),
			slog.String("user_agent", r.UserAgent()),
		)
	})
}

// responseWriter wraps http.ResponseWriter to capture status code and bytes written.
type responseWriter struct {
	http.ResponseWriter
	statusCode int
	written    int64
}

func (rw *responseWriter) WriteHeader(statusCode int) {
	rw.statusCode = statusCode
	rw.ResponseWriter.WriteHeader(statusCode)
}

func (rw *responseWriter) Write(b []byte) (int, error) {
	n, err := rw.ResponseWriter.Write(b)
	rw.written += int64(n)
	return n, err
}

// Flush forwards to the underlying ResponseWriter when it supports
// http.Flusher. Required for streaming responses (SSE) to keep working
// when this middleware is in the chain.
func (rw *responseWriter) Flush() {
	if f, ok := rw.ResponseWriter.(http.Flusher); ok {
		f.Flush()
	}
}

// Hijack forwards to the underlying ResponseWriter when it supports
// http.Hijacker. Required for protocol upgrades such as WebSocket.
func (rw *responseWriter) Hijack() (net.Conn, *bufio.ReadWriter, error) {
	if h, ok := rw.ResponseWriter.(http.Hijacker); ok {
		return h.Hijack()
	}
	return nil, nil, http.ErrNotSupported
}
