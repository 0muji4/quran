'use client';

import { SpanKind, SpanStatusCode, type AttributeValue } from '@opentelemetry/api';
import { onCLS, onFCP, onINP, onLCP, onTTFB, type Metric } from 'web-vitals';
import { getWebTracer } from './web-tracer';

// Phase 4.3-C (ADR 0019). Browser RUM via the `web-vitals` library.
// Each Core Web Vitals callback fires once per page load when the
// metric stabilises (LCP / FCP / INP / CLS / TTFB). We open a CLIENT
// span carrying the numeric value + the 'rating' bucket (good /
// needs-improvement / poor) and end it on the same tick — symmetric
// with `trackUiEvent` in use-ui-event.ts.
//
// Span naming: `web.vitals.{lcp,fcp,inp,cls,ttfb}`. Kept under a
// `web.vitals.*` prefix distinct from `web.ui.*` (user-driven) so the
// OTel collector / Loki / Grafana can route them onto a perf-only
// dashboard without parsing event attributes.
//
// PII: the only attributes shipped are numeric (`value`, `delta` in
// ms or unitless for CLS) and the enum `rating` label. No URL, path,
// referrer, user-agent, or DOM element identifier is included; the
// `web-vitals` library exposes attribution data under a separate
// `web-vitals/attribution` entry point that this module does NOT
// import. ADR 0019 §"PII boundary" has the full rationale.
//
// Idempotency: the module-level `initialised` flag prevents React
// StrictMode (which mounts effects twice in dev) from registering
// duplicate listeners.

export type WebVitalName =
  | 'web.vitals.lcp'
  | 'web.vitals.fcp'
  | 'web.vitals.inp'
  | 'web.vitals.cls'
  | 'web.vitals.ttfb';

let initialised = false;

const NAME_BY_METRIC: Record<string, WebVitalName> = {
  LCP: 'web.vitals.lcp',
  FCP: 'web.vitals.fcp',
  INP: 'web.vitals.inp',
  CLS: 'web.vitals.cls',
  TTFB: 'web.vitals.ttfb'
};

const trackVital = (name: WebVitalName, metric: Metric): void => {
  try {
    const attrs: Record<string, AttributeValue> = {
      'web.vitals.value': metric.value,
      'web.vitals.delta': metric.delta,
      'web.vitals.rating': metric.rating,
      'web.vitals.navigation_type': metric.navigationType
    };
    const span = getWebTracer().startSpan(name, {
      kind: SpanKind.CLIENT,
      attributes: attrs
    });
    span.setStatus({ code: SpanStatusCode.OK });
    span.end();
  } catch {
    // Best-effort; never break the page on a telemetry failure. The
    // OTLP exporter logs its own export failures internally.
  }
};

const dispatch = (metric: Metric): void => {
  const name = NAME_BY_METRIC[metric.name];
  if (!name) return;
  trackVital(name, metric);
};

export const initWebVitals = (): void => {
  if (initialised) return;
  if (typeof window === 'undefined') return;
  initialised = true;
  onLCP(dispatch);
  onFCP(dispatch);
  onINP(dispatch);
  onCLS(dispatch);
  onTTFB(dispatch);
};

// Test-only seam so vitest can reset the module-scoped guard between
// cases without resorting to vi.resetModules() at every callsite.
export const _resetForTesting = (): void => {
  initialised = false;
};
