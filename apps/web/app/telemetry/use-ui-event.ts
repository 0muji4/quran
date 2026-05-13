'use client';

import { SpanKind, SpanStatusCode, type AttributeValue } from '@opentelemetry/api';
import { getWebTracer } from './web-tracer';

// Phase 4.4 (ADR 0016). Lightweight wrapper around OTel spans for
// discrete UI events. The browser side does not need long-lived spans
// — UI events are point-in-time observations — so each call opens a
// span, sets attributes, and ends it on the same tick.
//
// Naming convention: every UI event uses the `web.ui.*` prefix so the
// browser-side span stream is trivially separable from the server-side
// `ServerAction: …` spans the BFF and Web Server Components produce.
// PII rule: never pass user-typed strings (email, transcript text)
// into `attrs`. Stick to enum-like fields (surahId, ayahNumber, reason,
// boolean toggles, durations). The ADR records this in writing.

export type UiEventName =
  | 'web.ui.recording_started'
  | 'web.ui.recording_stopped'
  | 'web.ui.recording_cancelled'
  | 'web.ui.suggested_clicked'
  | 'web.ui.loop_toggled'
  | 'web.ui.speed_changed'
  | 'web.ui.result_viewed';

export type UiEventAttrs = Record<string, AttributeValue>;

export const trackUiEvent = (name: UiEventName, attrs: UiEventAttrs = {}): void => {
  if (typeof window === 'undefined') return;
  try {
    const span = getWebTracer().startSpan(name, {
      kind: SpanKind.CLIENT,
      attributes: attrs
    });
    span.setStatus({ code: SpanStatusCode.OK });
    span.end();
  } catch {
    // The browser tracer is best-effort instrumentation; never let a
    // telemetry failure break the surrounding UI handler. The OTLP
    // exporter logs its own export failures internally.
  }
};
