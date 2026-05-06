import { NodeSDK } from '@opentelemetry/sdk-node';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import { OTLPMetricExporter } from '@opentelemetry/exporter-metrics-otlp-http';
import { PeriodicExportingMetricReader } from '@opentelemetry/sdk-metrics';
import { Resource } from '@opentelemetry/resources';
import { ATTR_SERVICE_NAME, ATTR_SERVICE_VERSION } from '@opentelemetry/semantic-conventions';
import { trace, metrics } from '@opentelemetry/api';

const serviceName = process.env.OTEL_SERVICE_NAME || 'quran-web';
const serviceVersion = process.env.SERVICE_VERSION || '0.0.0';
const otlpEndpoint = process.env.OTEL_EXPORTER_OTLP_ENDPOINT;

let sdk: NodeSDK | null = null;

export async function initTelemetry(): Promise<void> {
  if (!otlpEndpoint) {
    console.warn('OTEL_EXPORTER_OTLP_ENDPOINT not set, telemetry disabled');
    return;
  }

  const traceExporter = new OTLPTraceExporter({
    url: `${otlpEndpoint}/v1/traces`
  });

  const metricExporter = new OTLPMetricExporter({
    url: `${otlpEndpoint}/v1/metrics`
  });

  const resource = new Resource({
    [ATTR_SERVICE_NAME]: serviceName,
    [ATTR_SERVICE_VERSION]: serviceVersion,
    'service.namespace': 'quran-project'
  });

  sdk = new NodeSDK({
    traceExporter,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    metricReader: new PeriodicExportingMetricReader({
      exporter: metricExporter,
      exportIntervalMillis: 10000 // 10秒間隔（BFF/Backendと統一）
    }) as any,
    resource
  });

  await sdk.start();
}

export async function shutdownTelemetry(): Promise<void> {
  if (sdk) {
    await sdk.shutdown();
  }
}

// Tracer and Meter exports
export const tracer = trace.getTracer(serviceName);
export const meter = metrics.getMeter(serviceName);
