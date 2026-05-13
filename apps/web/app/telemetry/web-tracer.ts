'use client';

import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import { Resource } from '@opentelemetry/resources';
import { BatchSpanProcessor, WebTracerProvider } from '@opentelemetry/sdk-trace-web';
import { ATTR_SERVICE_NAME, ATTR_SERVICE_VERSION } from '@opentelemetry/semantic-conventions';
import { trace, type Tracer } from '@opentelemetry/api';

// Phase 4.4 (ADR 0016). Browser-side OTel tracer wiring.
//
// The server-side initialisation in telemetry.ts uses the Node SDK; the
// browser cannot reach the internal `otel-collector:4318` host directly,
// so this module reads `NEXT_PUBLIC_OTEL_ENDPOINT` (public env, baked
// at build time per Next.js convention) and ships traces to whatever
// public collector endpoint the env names. When the env is unset, the
// tracer falls back to the no-op global tracer; `trackUiEvent` keeps
// working but produces no exported spans, so dev / preview builds with
// no collector attached stay silent.
//
// One-shot idempotent init: the module-level flag prevents multiple
// React StrictMode mounts from registering duplicate providers.

const BROWSER_SERVICE_NAME = 'quran-web-browser';

let initialised = false;

export const initWebTelemetry = (): void => {
  if (initialised) return;
  if (typeof window === 'undefined') return;

  const endpoint = process.env.NEXT_PUBLIC_OTEL_ENDPOINT;
  if (!endpoint) {
    // No-op mode. Mark as initialised so we don't retry every render.
    initialised = true;
    return;
  }

  const exporter = new OTLPTraceExporter({
    url: `${endpoint.replace(/\/$/, '')}/v1/traces`
  });

  const provider = new WebTracerProvider({
    resource: new Resource({
      [ATTR_SERVICE_NAME]: BROWSER_SERVICE_NAME,
      [ATTR_SERVICE_VERSION]: process.env.NEXT_PUBLIC_SERVICE_VERSION ?? '0.0.0',
      'service.namespace': 'quran-project'
    }),
    spanProcessors: [new BatchSpanProcessor(exporter)]
  });

  provider.register();
  initialised = true;
};

// Tracer handle for `trackUiEvent`. Calling `trace.getTracer` before
// init returns the no-op tracer; once `initWebTelemetry` registers a
// provider, subsequent `getTracer` calls bind to it. We resolve at the
// call site so the order of imports does not matter.
export const getWebTracer = (): Tracer => trace.getTracer('quran-web-ui');

// Test-only seam — lets vitest reset the module-level singleton between
// cases. NOT for production callers.
export const __resetForTests = (): void => {
  initialised = false;
};
