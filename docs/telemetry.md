# Telemetry catalogue

Stable event names and attributes shared by web, iOS, and Android. The
contract here is what dashboards group by — keep names dot-segmented,
lowercase, and attribute keys snake_case. New events land here first;
clients then implement.

ADR 0008 (iOS) and the matching design intent on web/Android are the
upstream sources for this taxonomy.

## Library

| Event                     | Attributes                | Emitted from             |
| ------------------------- | ------------------------- | ------------------------ |
| `library.tab.selected`    | —                         | Bottom-tab selection     |
| `library.surah.opened`    | `surah_id`                | Tap on a surah row       |
| `library.continue.tapped` | `surah_id`, `ayah_number` | Tap on the Continue card |

## Practice

| Event                                              | Attributes         | Notes                                                                 |
| -------------------------------------------------- | ------------------ | --------------------------------------------------------------------- |
| `practice.reference.played`                        | `surah_id`, `ayah` | First play of the teacher reference                                   |
| `practice.recording.started`                       | `surah_id`, `ayah` | Tap of the record button                                              |
| `practice.recording.stopped`                       | `duration_ms`      | Tap of the stop button                                                |
| `practice.upload.completed.succeeded` / `.failed`  | `duration_ms`      | Emitted by `Telemetry.measure` wrapping the upload                    |
| `practice.scoring.completed.succeeded` / `.failed` | `duration_ms`      | Emitted by `Telemetry.measure` wrapping the poll loop                 |
| `practice.scoring.failed`                          | `error_code`       | Set to `AppError.telemetryCode` on iOS; matching value on web/Android |

## Result

| Event                     | Attributes              | Notes                              |
| ------------------------- | ----------------------- | ---------------------------------- |
| `result.try_again.tapped` | `surah_id`, `ayah`      | Secondary CTA on the result detail |
| `result.continue.tapped`  | `surah_id`, `next_ayah` | Primary CTA on the result detail   |

## Errors

Every failure surfaces through `Telemetry.error(_:context:)` (iOS) or
the equivalent on other platforms. The attached `error_code` is the
stable identifier and groups by `AppError` case (or its cross-platform
counterpart):

```
network
backend_unavailable
audio_permission_denied
audio_recording_failed
audio_playback_failed
reference_unavailable
scoring_timeout
storage_unavailable
```

## Subsystem identifiers

Per platform:

- iOS — OSLog subsystem `com.tilawah.ios` (categories: `event`, `error`, `measure`)
- Web — events flushed via `apps/web/app/telemetry/`
- Android — Logcat tag `com.tilawah.android` (production wiring is `TraceTelemetry`; `androidx.tracing.Trace` brackets the `measure(...)` regions so they appear in Perfetto and Studio Profiler timelines). Constants live in `apps/android/.../telemetry/Telemetry.kt`.

## Web-only RUM (browser OTel spans)

The events listed above are the **cross-platform** contract — every platform emits them with the same name. The Tilawah web build additionally ships two browser-only span namespaces that have no iOS / Android counterpart and therefore don't appear in the tables above:

| Namespace      | Source                                                                                                                                                             | Spec     |
| -------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ | -------- |
| `web.ui.*`     | User-driven UI events (`recording_started`, `loop_toggled`, `suggested_clicked`, etc.) emitted via `trackUiEvent()` from `apps/web/app/telemetry/use-ui-event.ts`. | ADR 0016 |
| `web.vitals.*` | Auto-captured Core Web Vitals (`lcp`, `fcp`, `inp`, `cls`, `ttfb`) emitted via `apps/web/app/telemetry/web-vitals.ts` from the `web-vitals` library.               | ADR 0019 |

Both flow through the same `WebTracerProvider` registered by `web-tracer.ts` and are gated by `NEXT_PUBLIC_OTEL_ENDPOINT`. The collector / Loki / Grafana can route them onto a web-perf dashboard with a `name =~ "web\..*"` filter while leaving the cross-platform `library.* / practice.* / result.*` stream intact.

PII rules (numeric / boolean / enum attributes only — no email, transcript, displayName, URL path) apply to both namespaces. ADR 0016 §"PII rules" is the canonical statement; ADR 0019 §"PII boundary" reinforces it for `web.vitals.*` and pins the contract with an attribute-key snapshot in the unit test.

## Adding events

## Adding events

1. Decide the dot-segmented name; respect existing sub-domains (`library.*`, `practice.*`, `result.*`).
2. Add the row above with attribute schema.
3. Open a PR per platform that consumes the new constant.
4. Verify dashboards pick up the new dimension before relying on it.
