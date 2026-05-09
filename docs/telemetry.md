# Telemetry catalogue

Stable event names and attributes shared by web, iOS, and Android. The
contract here is what dashboards group by — keep names dot-segmented,
lowercase, and attribute keys snake_case. New events land here first;
clients then implement.

ADR 0008 (iOS) and the matching design intent on web/Android are the
upstream sources for this taxonomy.

## Library

| Event | Attributes | Emitted from |
|-------|------------|--------------|
| `library.tab.selected` | — | Bottom-tab selection |
| `library.surah.opened` | `surah_id` | Tap on a surah row |
| `library.continue.tapped` | `surah_id`, `ayah_number` | Tap on the Continue card |

## Practice

| Event | Attributes | Notes |
|-------|------------|-------|
| `practice.reference.played` | `surah_id`, `ayah` | First play of the teacher reference |
| `practice.recording.started` | `surah_id`, `ayah` | Tap of the record button |
| `practice.recording.stopped` | `duration_ms` | Tap of the stop button |
| `practice.upload.completed.succeeded` / `.failed` | `duration_ms` | Emitted by `Telemetry.measure` wrapping the upload |
| `practice.scoring.completed.succeeded` / `.failed` | `duration_ms` | Emitted by `Telemetry.measure` wrapping the poll loop |
| `practice.scoring.failed` | `error_code` | Set to `AppError.telemetryCode` on iOS; matching value on web/Android |

## Result

| Event | Attributes | Notes |
|-------|------------|-------|
| `result.try_again.tapped` | `surah_id`, `ayah` | Secondary CTA on the result detail |
| `result.continue.tapped` | `surah_id`, `next_ayah` | Primary CTA on the result detail |

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

- iOS — OSLog subsystem `com.quran.ios` (categories: `event`, `error`, `measure`)
- Web — events flushed via `apps/web/app/telemetry/`
- Android — Logcat tag `com.quran.android` (production wiring is `TraceTelemetry`; `androidx.tracing.Trace` brackets the `measure(...)` regions so they appear in Perfetto and Studio Profiler timelines). Constants live in `apps/android/.../telemetry/Telemetry.kt`.

## Adding events

1. Decide the dot-segmented name; respect existing sub-domains (`library.*`, `practice.*`, `result.*`).
2. Add the row above with attribute schema.
3. Open a PR per platform that consumes the new constant.
4. Verify dashboards pick up the new dimension before relying on it.
