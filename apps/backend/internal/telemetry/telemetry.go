package telemetry

import (
	"context"
	"os"
	"sync"
	"time"

	"go.opentelemetry.io/otel"
	"go.opentelemetry.io/otel/attribute"
	"go.opentelemetry.io/otel/exporters/otlp/otlpmetric/otlpmetrichttp"
	"go.opentelemetry.io/otel/exporters/otlp/otlptrace/otlptracehttp"
	"go.opentelemetry.io/otel/metric"
	"go.opentelemetry.io/otel/propagation"
	sdkmetric "go.opentelemetry.io/otel/sdk/metric"
	"go.opentelemetry.io/otel/sdk/resource"
	sdktrace "go.opentelemetry.io/otel/sdk/trace"
	semconv "go.opentelemetry.io/otel/semconv/v1.26.0"
	"go.opentelemetry.io/otel/trace"
)

var (
	initOnce sync.Once
	initErr  error

	serviceName    = getenv("OTEL_SERVICE_NAME", "quran-backend")
	serviceVersion = getenv("SERVICE_VERSION", "0.0.0")
)

// Init configures OTLP exporters for traces and metrics.
func Init(ctx context.Context) error {
	initOnce.Do(func() {
		endpoint := os.Getenv("OTEL_EXPORTER_OTLP_ENDPOINT")
		traceOpts := []otlptracehttp.Option{}
		metricOpts := []otlpmetrichttp.Option{}
		if endpoint != "" {
			traceOpts = append(traceOpts, otlptracehttp.WithEndpointURL(endpoint+"/v1/traces"))
			metricOpts = append(metricOpts, otlpmetrichttp.WithEndpointURL(endpoint+"/v1/metrics"))
		}

		traceExporter, err := otlptracehttp.New(ctx, traceOpts...)
		if err != nil {
			initErr = err
			return
		}

		metricExporter, err := otlpmetrichttp.New(ctx, metricOpts...)
		if err != nil {
			initErr = err
			return
		}

		res, err := resource.New(
			ctx,
			resource.WithAttributes(
				semconv.ServiceName(serviceName),
				semconv.ServiceVersion(serviceVersion),
				attribute.String("service.namespace", "quran-project"),
			),
		)
		if err != nil {
			initErr = err
			return
		}

		otel.SetTracerProvider(sdktrace.NewTracerProvider(
			sdktrace.WithBatcher(traceExporter),
			sdktrace.WithResource(res),
		))
		otel.SetMeterProvider(sdkmetric.NewMeterProvider(
			sdkmetric.WithReader(sdkmetric.NewPeriodicReader(metricExporter, sdkmetric.WithInterval(10*time.Second))),
			sdkmetric.WithResource(res),
		))

		// Set W3C Trace Context propagator for distributed tracing
		otel.SetTextMapPropagator(propagation.NewCompositeTextMapPropagator(
			propagation.TraceContext{},
			propagation.Baggage{},
		))
	})

	return initErr
}

// Tracer returns the backend tracer.
func Tracer() trace.Tracer {
	return otel.Tracer(serviceName)
}

// Meter returns the backend meter.
func Meter() metric.Meter {
	return otel.Meter(serviceName)
}

func getenv(key, fallback string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}
	return fallback
}
