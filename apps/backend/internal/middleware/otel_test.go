package middleware

import (
	"bufio"
	"context"
	"net"
	"net/http"
	"net/http/httptest"
	"testing"

	"go.opentelemetry.io/otel"
	"go.opentelemetry.io/otel/propagation"
	sdkmetric "go.opentelemetry.io/otel/sdk/metric"
	sdktrace "go.opentelemetry.io/otel/sdk/trace"
	"go.opentelemetry.io/otel/trace"
)

func TestOTELMiddleware(t *testing.T) {
	// Setup tracer and meter providers
	tp := sdktrace.NewTracerProvider(
		sdktrace.WithSampler(sdktrace.AlwaysSample()),
	)
	otel.SetTracerProvider(tp)
	defer tp.Shutdown(context.Background())

	reader := sdkmetric.NewManualReader()
	mp := sdkmetric.NewMeterProvider(sdkmetric.WithReader(reader))
	otel.SetMeterProvider(mp)
	defer mp.Shutdown(context.Background())

	// Create test handler
	handler := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
		w.Write([]byte("ok"))
	})

	// Wrap with OTEL middleware
	wrapped := OTEL(handler)

	// Create request
	req := httptest.NewRequest("GET", "/test", nil)
	rec := httptest.NewRecorder()

	// Execute request
	wrapped.ServeHTTP(rec, req)

	// Verify response
	if rec.Code != http.StatusOK {
		t.Errorf("expected status 200, got %d", rec.Code)
	}
	if rec.Body.String() != "ok" {
		t.Errorf("expected body 'ok', got %s", rec.Body.String())
	}
}

func TestOTELMiddlewareTraceContextPropagation(t *testing.T) {
	tp := sdktrace.NewTracerProvider(
		sdktrace.WithSampler(sdktrace.AlwaysSample()),
	)
	otel.SetTracerProvider(tp)
	defer tp.Shutdown(context.Background())

	mp := sdkmetric.NewMeterProvider()
	otel.SetMeterProvider(mp)
	defer mp.Shutdown(context.Background())

	// Set W3C propagator
	otel.SetTextMapPropagator(propagation.TraceContext{})

	var receivedCtx context.Context
	handler := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		receivedCtx = r.Context()
		w.WriteHeader(http.StatusOK)
	})

	wrapped := OTEL(handler)

	// Create parent span
	ctx, span := tp.Tracer("test").Start(context.Background(), "parent")
	defer span.End()

	// Create request with trace context
	req := httptest.NewRequest("GET", "/test", nil)
	carrier := propagation.HeaderCarrier(req.Header)
	otel.GetTextMapPropagator().Inject(ctx, carrier)

	rec := httptest.NewRecorder()
	wrapped.ServeHTTP(rec, req)

	// Verify trace context was extracted
	if receivedCtx == nil {
		t.Fatal("expected context to be set")
	}

	spanCtx := trace.SpanContextFromContext(receivedCtx)
	if !spanCtx.IsValid() {
		t.Error("expected valid span context")
	}
}

func TestOTELMiddlewareErrorStatus(t *testing.T) {
	tp := sdktrace.NewTracerProvider(
		sdktrace.WithSampler(sdktrace.AlwaysSample()),
	)
	otel.SetTracerProvider(tp)
	defer tp.Shutdown(context.Background())

	mp := sdkmetric.NewMeterProvider()
	otel.SetMeterProvider(mp)
	defer mp.Shutdown(context.Background())

	// Handler that returns 500 error
	handler := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusInternalServerError)
		w.Write([]byte("error"))
	})

	wrapped := OTEL(handler)

	req := httptest.NewRequest("GET", "/test", nil)
	rec := httptest.NewRecorder()

	wrapped.ServeHTTP(rec, req)

	if rec.Code != http.StatusInternalServerError {
		t.Errorf("expected status 500, got %d", rec.Code)
	}
}

func TestResponseWriter(t *testing.T) {
	rec := httptest.NewRecorder()
	rw := &responseWriter{ResponseWriter: rec, statusCode: http.StatusOK}

	// Test WriteHeader
	rw.WriteHeader(http.StatusCreated)
	if rw.statusCode != http.StatusCreated {
		t.Errorf("expected status 201, got %d", rw.statusCode)
	}

	// Test Write
	n, err := rw.Write([]byte("test"))
	if err != nil {
		t.Fatalf("Write failed: %v", err)
	}
	if n != 4 {
		t.Errorf("expected 4 bytes written, got %d", n)
	}
	if rw.written != 4 {
		t.Errorf("expected written=4, got %d", rw.written)
	}
}

// TestResponseWriterFlushForwards confirms Flush proxies to the
// underlying ResponseWriter when it implements http.Flusher.
// httptest.ResponseRecorder is one such writer.
func TestResponseWriterFlushForwards(t *testing.T) {
	rec := httptest.NewRecorder()
	rw := &responseWriter{ResponseWriter: rec, statusCode: http.StatusOK}

	// Calling Flush() on the wrapper must not panic and must propagate
	// to the recorder (which exposes a Flushed bool).
	rw.Flush()
	if !rec.Flushed {
		t.Error("expected underlying ResponseRecorder.Flushed = true")
	}
}

// TestResponseWriterFlushNoop verifies Flush is a no-op when the
// underlying writer does not implement http.Flusher (no panic).
func TestResponseWriterFlushNoop(t *testing.T) {
	rw := &responseWriter{ResponseWriter: nonFlusher{}, statusCode: http.StatusOK}
	rw.Flush() // must not panic
}

// TestResponseWriterHijackForwards verifies Hijack returns
// ErrNotSupported when the underlying writer does not implement
// http.Hijacker — the path taken by httptest.ResponseRecorder.
func TestResponseWriterHijackReturnsErrNotSupported(t *testing.T) {
	rw := &responseWriter{ResponseWriter: httptest.NewRecorder(), statusCode: http.StatusOK}
	_, _, err := rw.Hijack()
	if err != http.ErrNotSupported {
		t.Errorf("Hijack err = %v, want http.ErrNotSupported", err)
	}
}

// TestResponseWriterHijackForwardsToHijacker exercises the forwarding
// path against a stub that does implement http.Hijacker.
func TestResponseWriterHijackForwardsToHijacker(t *testing.T) {
	stub := &hijackableRecorder{ResponseRecorder: httptest.NewRecorder()}
	rw := &responseWriter{ResponseWriter: stub, statusCode: http.StatusOK}
	_, _, err := rw.Hijack()
	if err != nil {
		t.Fatalf("Hijack returned error: %v", err)
	}
	if !stub.hijacked {
		t.Error("expected stub.Hijack to be called")
	}
}

type nonFlusher struct{ http.ResponseWriter }

type hijackableRecorder struct {
	*httptest.ResponseRecorder
	hijacked bool
}

func (h *hijackableRecorder) Hijack() (net.Conn, *bufio.ReadWriter, error) {
	h.hijacked = true
	return nil, nil, nil
}
