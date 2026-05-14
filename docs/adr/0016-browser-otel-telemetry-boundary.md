# ADR 0016: Browser OTel telemetry boundary and event taxonomy

- Status: Accepted
- Date: 2026-05-13
- Author: motoshi.suzuki
- Tracks: Phase 4.4 in `docs/web-tilawah-followups.md`

## Context

Server-side telemetry has been in place since the redesign: BFF and Web Server Components produce OTel spans through `apps/bff/src/telemetry/*` (Node SDK) and `apps/web/app/telemetry/telemetry.ts` (also Node SDK). Both report to the dev / prod OTel collector via `OTEL_EXPORTER_OTLP_ENDPOINT`.

Browser-side UI events are still un-instrumented. We want to measure:

- The recording funnel — `recording_started` → `recording_stopped` / `recording_cancelled`, and how it interacts with `result_viewed`.
- Suggested-card clicks, attributed to the BFF `/me/suggestions` `reason` field (Phase 3.3 / ADR 0015 prepared the payload for this).
- Teacher controls — loop toggle, playback rate changes — as a proxy for "is the practice flow useful".

Three sub-problems show up when you actually wire this:

1. **SDK split.** The Node SDK that powers the server side does not run in the browser; the OTel project ships a separate `@opentelemetry/sdk-trace-web` package. The version surface has to line up with the existing `@opentelemetry/api@1.9.0` and `@opentelemetry/exporter-trace-otlp-http@0.51.x`.
2. **Endpoint reachability.** The browser cannot resolve `otel-collector:4318` — that hostname only exists inside the compose network. A second collector endpoint (or a Next.js proxy route) has to be exposed publicly.
3. **PII risk.** Browser-side spans run on the user's network and travel to a collector with whatever attributes the caller passes. There is real risk of accidentally including the email address, the transcript text, or the spoken audio's metadata if the call site is careless.

## Decision

**Bootstrap a browser-side `WebTracerProvider` in a single `'use client'` module, expose a small `trackUiEvent(name, attrs)` helper with a closed event-name union, and gate the exporter on a `NEXT_PUBLIC_OTEL_ENDPOINT` env so the pipeline is opt-in per environment.**

### Module shape

- `apps/web/app/telemetry/web-tracer.ts` — idempotent `initWebTelemetry()` that registers a `WebTracerProvider` with a `BatchSpanProcessor` + `OTLPTraceExporter` when `NEXT_PUBLIC_OTEL_ENDPOINT` is set; no-ops otherwise. `getWebTracer()` returns the OTel global tracer for `'quran-web-ui'`.
- `apps/web/app/telemetry/use-ui-event.ts` — `trackUiEvent(name, attrs?)` opens a span, sets attributes, ends it on the same tick. Wrapped in `try/catch` so a telemetry failure cannot break the surrounding handler. Server-rendered (`typeof window === 'undefined'`) calls are no-ops.
- `apps/web/app/telemetry/WebTelemetryInit.tsx` — tiny `'use client'` component that calls `initWebTelemetry()` from `useEffect`. Mounted once at the top of `app/layout.tsx`.

### Event-name union

`trackUiEvent`'s first argument is a closed TypeScript union — adding a new event requires adding a literal to the union, which forces a code review of the new event name + intent. Initial set, Phase 4.4 scope:

```
web.ui.recording_started
web.ui.recording_stopped
web.ui.recording_cancelled
web.ui.suggested_clicked
web.ui.loop_toggled
web.ui.speed_changed
web.ui.result_viewed
```

`web.ui.*` prefix keeps browser spans trivially separable from the server-side `ServerAction: …` spans in any downstream query.

### PII rules

The PR description and this ADR commit to **never** passing user-typed strings (email, transcript text, displayName) into `attrs`. Allowed values are:

- Enum-like strings already present in the codebase (`surahId`, `reason`, `'easy' | 'medium' | 'hard'`).
- Numeric and boolean toggles (`ayahNumber`, `loop: true`, `rateMultiplier: 1.25`).
- Durations and counts.

Anything else is opt-in by editing `UiEventAttrs` (currently `Record<string, AttributeValue>`) — the looseness is a starting point; if we find a class of attributes routinely needing extra plumbing, tighten the type later.

### Endpoint policy

- `NEXT_PUBLIC_OTEL_ENDPOINT` is the **only** env that flips the pipeline on. Build-time bake-in per Next.js convention.
- Unset → init is a no-op, `trackUiEvent` keeps working (returns immediately), no network traffic.
- Set → exporter ships to `${endpoint}/v1/traces`. Production deploys will configure this to the collector's public hostname; CI keeps it unset so e2e runs do not generate trace noise.

## Rationale

- **A closed event-name union is cheaper than runtime allow-listing.** Type-narrowed call sites mean a renamed or new event surfaces as a TS error before merge, instead of an out-of-band sampling decision.
- **`'use client'` modules + `useEffect` init is the standard Next.js shape.** No need to invent a custom initialisation lifecycle.
- **Gating on `NEXT_PUBLIC_OTEL_ENDPOINT` keeps the rollout incremental.** We can ship Phase 4.4 today, leave the env unset in CI / preview, and turn it on per environment once the public collector is provisioned.
- **try/catch around span emission is non-negotiable.** Telemetry is a passenger, not a driver. A broken exporter cannot block a recording.

## Consequences

### Positive

- Phase 4.4 has a clear instrumentation surface; A3-b adds `trackUiEvent` calls in `useRecorder`, `SuggestedCard`, `TeacherPanel`, and the result page without touching this scaffold.
- 3.3's `reason` field (ADR 0015) becomes immediately useful: `web.ui.suggested_clicked` carries it as an attribute, and downstream analysis can attribute Suggested-card clicks to the selection branch that produced them.
- The same OTel collector continues to be the single observability sink — no new tooling.

### Negative

- Two telemetry stacks (Node + Web) in the same Next.js app. Their versions can drift. Mitigation: pin `@opentelemetry/sdk-trace-web` to the same 1.27.x minor as `resources` / `sdk-metrics`.
- Adding a new event requires touching the union. Slight friction but intentional.
- Production deploys must provide a public collector endpoint reachable from end-user browsers. That is a deployment task, not a code task; tracked at deployment time.

### Reconsideration triggers

- The event union grows past ~30 entries → consider an open `string` type with a separate allow-list rule.
- We need long-lived spans (e.g., to instrument the full recording flow as a single span tree). The current "open + immediately end" pattern is point-in-time; extending it to nested / async spans is straightforward but requires a different helper shape.
- Browser-side error telemetry (Sentry-style) becomes a requirement → at that point we likely want a wider browser-observability ADR rather than extending this one.

## References

- `apps/web/app/telemetry/web-tracer.ts` — browser tracer init
- `apps/web/app/telemetry/use-ui-event.ts` — `trackUiEvent` helper + event-name union
- `apps/web/app/telemetry/WebTelemetryInit.tsx` — layout init component
- `apps/web/app/layout.tsx` — wiring site
- ADR 0015 — Phase 3.3 `reason` field that 4.4 surfaces in `web.ui.suggested_clicked`
- ADR 0019 — extends this namespacing convention with a sibling `web.vitals.*` stream (Core Web Vitals via the same `WebTracerProvider`, same PII envelope, same env gate)
- `docs/web-tilawah-followups.md` §4.4 — original carve-out
