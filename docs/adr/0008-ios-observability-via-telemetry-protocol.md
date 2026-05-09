# ADR 0008: iOS Observability — `Telemetry` Protocol Backed by OSLog

- Status: Accepted
- Date: 2026-05-09
- Author: motoshi.suzuki

## Context

The current iOS app emits no structured telemetry; the only observability is `print(...)` calls in `RecordingViewModel.stopAndScore()`. The web app has a dedicated telemetry pipeline at `apps/web/app/telemetry/` that captures product and performance signals. Reaching feature parity on iOS includes giving the team enough signal to validate releases — recording success rate, scoring duration, error-rate per `AppError` case, and conversion through the Library → Practice → Result funnel. Without this, post-release effect verification (an explicit engineering objective for the period) is impossible on iOS.

A third-party analytics vendor (Firebase, Amplitude, etc.) is not currently approved for the project. Apple's first-party `OSLog` (`os.Logger` + `os_signpost`) is available on iOS 16+, integrates with Console.app and Instruments, and has zero runtime cost when log levels are filtered out.

## Decision

We introduce a `Telemetry` protocol with two implementations and a fixed event taxonomy.

```swift
protocol Telemetry {
  func event(_ name: String, attributes: [String: String])
  func measure<T>(_ name: String, _ block: () async throws -> T) async rethrows -> T
  func error(_ error: AppError, context: [String: String])
}

struct OSLogTelemetry: Telemetry { /* Logger(subsystem: "com.tilawah.ios"), os_signpost */ }
struct NoOpTelemetry: Telemetry  { /* used by tests and Previews */ }
```

Event names follow a dot-segmented namespace shared with web and Android. Initial set:

| Event | Attributes | Emitted from |
|-------|------------|--------------|
| `library.tab.selected` | — | `AppRoot` |
| `library.surah.opened` | `surah_id` | `LibraryViewModel` |
| `practice.reference.played` | `surah_id`, `ayah` | `PracticeViewModel` |
| `practice.recording.started` | `surah_id`, `ayah` | `PracticeViewModel` |
| `practice.recording.stopped` | `duration_ms` | `PracticeViewModel` |
| `practice.upload.completed` | `size_bytes`, `duration_ms`, `success` | `PracticeViewModel` (via `measure`) |
| `practice.scoring.completed` | `poll_count`, `duration_ms`, `status`, `score` | `PracticeViewModel` (via `measure`) |
| `practice.scoring.failed` | `error_code` (= `AppError` case name) | `PracticeViewModel` |
| `result.try_again.tapped` | `surah_id`, `ayah` | `ResultDetailViewModel` |
| `result.continue.tapped` | `surah_id`, `next_ayah` | `ResultDetailViewModel` |
| (any thrown `AppError`) | (case-derived) | every facade boundary via `Telemetry.error` |

The taxonomy is documented in `docs/telemetry.md` (added alongside the iOS rollout) and is the contract that web and Android are expected to honour.

## Rationale

- **OSLog ships with the platform.** Zero new dependencies, zero per-event cost when filtered, native integration with Console.app and Instruments. `os_signpost` makes `measure(...)` regions visible in Instruments timelines for free.
- **Protocol abstraction preserves the upgrade path.** When the project commits to a vendor (Firebase, Amplitude), `FirebaseTelemetry: Telemetry` plugs in without touching ViewModel call sites.
- **`AppError` case names are the stable error label.** Because every layer normalises to `AppError` (ADR 0006), the dimension cardinality of `practice.scoring.failed.error_code` is bounded and meaningful.
- **Cross-platform event taxonomy** is what makes funnel analysis possible. Inconsistent names across web / Android / iOS would force per-platform dashboards. The dot-segmented convention matches what web emits and is cheap to enforce.
- **`NoOpTelemetry` for tests** keeps unit tests free of log noise and lets us assert "no telemetry was sent on this path" if needed via a `TelemetrySpy` test double.

## Consequences

Positive:

- Post-release dashboards become possible: scoring success rate, recording-to-result conversion, error breakdown by `AppError` case.
- Instruments traces show end-to-end signpost regions (record → upload → poll) with no extra wiring.
- Vendor-swap is a one-class change.
- The taxonomy doubles as documentation of the user journey.

Negative:

- An out-of-band analytics destination still requires future work (vendor selection, GDPR review, network egress in OSLog → metrics).
- The taxonomy must be kept in sync across three platforms. Mitigated by `docs/telemetry.md` as the source of truth and by code review.
- OSLog inspection requires Console.app or Xcode's log viewer — not as turnkey as a hosted dashboard.

## Alternatives Considered

- **No telemetry until a vendor is chosen.** Rejected: leaves us unable to validate releases. The cost of `os.Logger` is so low that there is no reason to defer.
- **Adopt Firebase / Amplitude SDK now.** Rejected: dependency, vendor approval, GDPR review, and SDK weight outweigh the value before the product has even shipped.
- **OpenTelemetry Swift SDK.** Considered. The web and BFF stack already use OTel. iOS could ship spans to the OTel Collector. Rejected for now: SDK maturity on iOS is limited and the operational cost (collector reachable from devices, network egress, batching) is non-trivial. Worth re-evaluating once a production deploy and OTel-friendly endpoint exist.
- **Print-statement-only.** Rejected: not searchable, not filterable by subsystem, not measurable.

## Reconsideration Triggers

Re-open when **any** of:

1. Product or growth team requires hosted dashboards → adopt a vendor `Telemetry` implementation.
2. iOS user count justifies the OTel collector path → switch to `OpenTelemetryTelemetry`.
3. Event taxonomy diverges meaningfully across platforms → promote `docs/telemetry.md` from informational to enforced (lint / schema check).
4. Privacy regulation requires explicit consent flows → wire a consent gate in the `Telemetry` adapter.

## References

- `apps/web/app/telemetry/` — web telemetry pipeline (parity reference)
- `apps/ios/Sources/QuranRecitationApp/RecordingViewModel.swift:65` — current `print` usage
- `ops/observability/` — existing OTel collector (potential future destination)
- ADR 0006 — `AppError` is the stable error vocabulary feeding `practice.scoring.failed.error_code`
