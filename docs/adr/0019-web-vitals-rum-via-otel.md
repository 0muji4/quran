# ADR 0019: Web Vitals as RUM, shipped via the existing browser OTel tracer (Phase 4.3-C)

- Status: Accepted
- Date: 2026-05-14
- Author: motoshi.suzuki
- Tracks: Phase 4.3-C in `docs/web-tilawah-followups.md`

## Context

Phase 4.3-A (#245 / ADR 0018) captured a one-shot bundle baseline; Phase 4.3-B (#246) flattened the `/practice` page tree to leave room for finer-grained perf work. Neither tells us **what real browsers see** when they paint the Tilawah pages — LCP, FCP, INP, CLS, TTFB. Without those numbers any subsequent perf work (4.3-D Amiri unicode-range carving in particular) is optimisation by vibe.

Two possible sources:

1. **Synthetic** — run Lighthouse against a frozen build in CI; treat the score as the canonical baseline.
2. **Real-user monitoring (RUM)** — subscribe to the browser's `PerformanceObserver` via the `web-vitals` library, ship metrics out as telemetry.

Phase 4.4 (ADR 0016) already shipped a browser-side OTel tracer (`apps/web/app/telemetry/web-tracer.ts`) with a closed event-union pattern (`web.ui.*`) and a hard PII boundary (numeric / enum-only attributes — no email, transcript, displayName, URL path). The infrastructure to receive Web Vitals is already in place; only the producer side is missing.

## Decision

**Wire the `web-vitals` library into the existing browser OTel tracer as `web.vitals.*` spans. Skip a synthetic Lighthouse run for now.**

### Mechanism

A new `apps/web/app/telemetry/web-vitals.ts` module subscribes once per page load:

```ts
onLCP(dispatch);
onFCP(dispatch);
onINP(dispatch);
onCLS(dispatch);
onTTFB(dispatch);
```

`dispatch` maps each `Metric.name` to a corresponding `web.vitals.*` span name and opens a CLIENT span on the tracer returned by `getWebTracer()`. The span carries four attributes and ends on the same tick — same shape as `trackUiEvent` in `use-ui-event.ts`.

`WebTelemetryInit.tsx` calls `initWebVitals()` immediately after `initWebTelemetry()`. Both functions guard against StrictMode double-mount with a module-scoped `initialised` flag. When `NEXT_PUBLIC_OTEL_ENDPOINT` is unset, the tracer returned by `getWebTracer()` is the global no-op tracer; the subscriptions still fire but their spans go nowhere. Dev / preview builds stay silent without a special-case branch.

### Span naming

Distinct from the `web.ui.*` (user-driven) event namespace introduced in ADR 0016:

| Vital                     | Span name         |
| ------------------------- | ----------------- |
| Largest Contentful Paint  | `web.vitals.lcp`  |
| First Contentful Paint    | `web.vitals.fcp`  |
| Interaction to Next Paint | `web.vitals.inp`  |
| Cumulative Layout Shift   | `web.vitals.cls`  |
| Time to First Byte        | `web.vitals.ttfb` |

Keeping `vitals` and `ui` under the same `web.*` prefix lets the OTel collector / Loki / Grafana route them to one perf-only dashboard later without parsing attributes. The two sub-namespaces let downstream filtering distinguish user-action timings from auto-captured paint metrics.

### Attribute set

Each `web.vitals.*` span carries exactly:

- `web.vitals.value` (numeric, milliseconds for time vitals or unitless for CLS)
- `web.vitals.delta` (numeric, identical to value on first observation; differs on subsequent updates)
- `web.vitals.rating` (enum: `'good' | 'needs-improvement' | 'poor'`)
- `web.vitals.navigation_type` (enum: `'navigate' | 'reload' | 'back-forward' | 'back-forward-cache' | 'prerender' | 'restore'`)

### PII boundary

The `web-vitals` package exposes an optional `web-vitals/attribution` entry point that adds DOM-element targets, hostnames, and URL fragments to each metric (`LCPAttribution.element`, `LCPAttribution.url`, ...). **This ADR commits to NOT importing that entry point.** Only the base `web-vitals` import is allowed.

The unit test `web-vitals.test.ts` enforces this by snapshotting the exact attribute key set on a span emission and failing the build if any new key appears. Reviewers can rely on the test as the contract — a future refactor that adds `attribution` data will trip the snapshot and re-open this ADR.

Recap of ADR 0016 §"PII rules": numeric, boolean, or enum-like fields only. `web.vitals.*` is within that envelope by construction.

### Why not Lighthouse CI yet

- **Real users beat synthetic for this stack.** The page surfaces Arabic glyphs through Amiri, which Lighthouse Chrome won't render the same way every iOS Safari user will. RUM captures the actual distribution; Lighthouse captures one Linux Chromium under one specific viewport.
- **No CI cost.** Lighthouse CI nightly was the alternative; it would have added a workflow job and a per-PR latency hit for synthetic budgets we'd then have to babysit. RUM is a one-time wiring change with zero CI cost.
- **Lighthouse stays open as 4.3-C-followup.** If the OTel collector data turns out to be insufficient (e.g. too few users for any RUM percentile to be meaningful) we revisit and add Lighthouse CI then. ADR 0017's PR-vs-nightly carve-out pattern is the template if we go there.

### No thresholds, no CI gate

This PR ships measurement, not gates. Reasons:

- The `rating` bucket from `web-vitals` already encodes the canonical Web Vitals thresholds (LCP ≤ 2.5s = good, ≤ 4s = needs-improvement, > 4s = poor; equivalently for the others). Re-encoding them locally would duplicate.
- We don't yet know our own distribution. Setting a CI gate before that is guesswork. After a few weeks of data, ADR 0019-followup can codify SLOs.

## Bundle impact

Measured against the post-4.3-A/B baseline:

| Route                              | Before (4.3-A) |                         After (4.3-C) |
| ---------------------------------- | -------------: | ------------------------------------: |
| `/` First Load JS                  |         130 kB |                       **131 kB (+1)** |
| `/practice/[s]/[a]` First Load JS  |         136 kB | 136 kB (no change at print precision) |
| `app/layout-*.js` (raw, per-route) |         7.4 kB |     **14.4 kB (+7 raw ≈ +3 gzipped)** |

`web-vitals@4.2.4` is ~3 kB gzipped including its `PerformanceObserver` plumbing. It lands in the root layout chunk because `WebTelemetryInit` is mounted in `app/layout.tsx`. The shared 102 kB framework / OTel-base chunks are unchanged.

## Consequences

### Positive

- Real Web Vitals visible in the same OTel pipeline that already carries `web.ui.*` events — single dashboard query, single retention policy.
- PII-clean by construction; the attribute key snapshot is mechanical proof.
- Zero CI cost; no new workflow, no per-PR latency.
- Lays the groundwork for 4.3-D's before/after comparison — when Amiri subsetting lands, the same `web.vitals.lcp` distribution will show the delta.

### Negative

- ~3 kB gzipped JS on every route. Acceptable; baseline `/practice/[s]/[a]` is still 136 kB.
- RUM data is only as good as the collector endpoint. Until `NEXT_PUBLIC_OTEL_ENDPOINT` is provisioned in production, this is dead code. (It's still safe — the no-op tracer drops the spans.)
- No synthetic baseline means perf regressions only surface once production has them. The 4.3-A bundle summary remains the PR-time perf gate.

### Reconsideration triggers

- Real-user data turns out to be too sparse to derive percentiles → revisit and add Lighthouse CI as a synthetic complement.
- `web-vitals` releases a major version with breaking changes to the `Metric` shape → re-pin and audit the test snapshot.
- A future feature _needs_ attribution data (element-level breakdowns) → re-evaluate the PII boundary; importing `web-vitals/attribution` would re-open this ADR.

## References

- `apps/web/app/telemetry/web-vitals.ts` — subscriber module
- `apps/web/app/telemetry/WebTelemetryInit.tsx` — bootstrap callsite
- `apps/web/app/telemetry/__tests__/web-vitals.test.ts` — PII attribute-key snapshot + rating bucket coverage
- ADR 0016 — `web.ui.*` event union, PII rules this builds on
- ADR 0018 — bundle baseline this measures against
- `docs/web-tilawah-followups.md` §4.3 — Phase 4.3 sub-PR breakdown
