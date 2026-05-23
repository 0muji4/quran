import { diag, DiagConsoleLogger, DiagLogLevel, metrics, trace } from '@opentelemetry/api';
import { OTLPMetricExporter } from '@opentelemetry/exporter-metrics-otlp-http';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import { resourceFromAttributes } from '@opentelemetry/resources';
import { PeriodicExportingMetricReader } from '@opentelemetry/sdk-metrics';
import { NodeSDK } from '@opentelemetry/sdk-node';
import { ATTR_SERVICE_NAME, ATTR_SERVICE_VERSION } from '@opentelemetry/semantic-conventions';

const serviceName = process.env.OTEL_SERVICE_NAME ?? 'quran-bff';
const serviceVersion = process.env.SERVICE_VERSION ?? '0.0.0';
const exporterEndpoint = process.env.OTEL_EXPORTER_OTLP_ENDPOINT;

diag.setLogger(new DiagConsoleLogger(), DiagLogLevel.ERROR);

const traceExporter = new OTLPTraceExporter(
  exporterEndpoint
    ? {
        url: `${exporterEndpoint.replace(/\/+$/, '')}/v1/traces`
      }
    : undefined
);

const metricExporter = new OTLPMetricExporter(
  exporterEndpoint
    ? {
        url: `${exporterEndpoint.replace(/\/+$/, '')}/v1/metrics`
      }
    : undefined
);

const resource = resourceFromAttributes({
  [ATTR_SERVICE_NAME]: serviceName,
  [ATTR_SERVICE_VERSION]: serviceVersion
});

const metricReader = new PeriodicExportingMetricReader({
  exporter: metricExporter,
  exportIntervalMillis: 10_000
});

const sdk = new NodeSDK({
  resource,
  traceExporter,
  metricReader
});

sdk.start();

export const telemetry = {
  tracer: trace.getTracer(serviceName),
  meter: metrics.getMeter(serviceName)
};

export const shutdownTelemetry = async (): Promise<void> => {
  await sdk.shutdown();
};
