# ADR 0006: iOS Layer Boundaries — Protocol Facades and a Unified `AppError`

- Status: Accepted
- Date: 2026-05-09
- Author: motoshi.suzuki

## Context

`apps/ios/Sources/QuranRecitationApp/RecordingViewModel.swift` instantiates `QuranAPIClient` and `AudioRecorder` directly. There is no seam to substitute fakes in tests. Errors thrown from the network and audio layers — `QuranAPIError.graphQLError`, `QuranAPIError.uploadFailed`, raw `NSError` from AVFoundation — surface in the View as `error.localizedDescription`, producing technical strings ("The operation couldn't be completed", GraphQL error JSON) that are unfit for end users.

At the same time, the upcoming Practice screen needs both Apollo (surahs, scoring jobs) **and** the BFF REST endpoint `GET /reference-audio?surah=N&ayah=M` (`apps/bff/src/rest/rest.ts:225`) to fetch teacher reference audio, because the GraphQL schema currently has no equivalent query. ViewModels should not have to know that some calls are GraphQL and others are REST.

## Decision

We introduce three protocol-based facades and one cross-layer error type:

1. **`protocol QuranBackend`** in `Backend/QuranBackend.swift` exposes async methods (`surahs() -> [Surah]`, `surah(id:) -> SurahDetail?`, `referenceAudio(surahId:ayahNumber:) -> ReferenceAudio`, `getSignedUploadUrl(...)`, `createScoringJob(...)`, `pollScoringResult(jobId:) -> ScoringResult`). The production implementation `ApolloBackend: QuranBackend` aggregates Apollo calls and the REST call to `/reference-audio` behind one surface.
2. **Audio facades** (`AudioRecorder`, `AudioPlayer`, `AudioSessionCoordinator`) are extracted into `Audio/` and exposed as protocols so ViewModels never reference AVFoundation types directly.
3. **`protocol HistoryStore`** abstracts persistence (see ADR 0007).
4. **`enum AppError: LocalizedError`** in `App/AppError.swift` is the single error type ViewModels see:
   ```swift
   enum AppError: LocalizedError {
     case network(underlying: Error)
     case backendUnavailable(operation: String)
     case audioPermissionDenied
     case audioRecordingFailed(underlying: Error)
     case audioPlaybackFailed(underlying: Error)
     case referenceUnavailable(surahId: String, ayah: Int)
     case scoringTimeout
     case storageUnavailable
     var errorDescription: String? { /* NSLocalizedString lookup */ }
     var isRetriable: Bool { /* per case */ }
   }
   ```
   Each adapter (`ApolloBackend`, `ReferenceAudioClient`, `AudioRecorder`, etc.) catches its native errors at its boundary and re-throws as `AppError`. ViewModels switch on `AppError` to drive UI state and telemetry.

## Rationale

- **Testability.** Protocol facades let ViewModel tests drive deterministic flows (success, network error, permission denied, scoring timeout) without spinning up Apollo, AVFoundation, or `UserDefaults`.
- **Heterogeneous transports stay an implementation detail.** Reference audio is REST today and might become a GraphQL query later. Hiding the choice inside `ApolloBackend` means callers do not change when the transport changes.
- **One error vocabulary across layers** is the only way to make UI copy, telemetry labels, and retry decisions consistent. Without it, every screen re-implements ad-hoc error mapping.
- **`isRetriable` on the type** lets the Practice error panel decide between "Replay" (retriable) and "Record again" (non-retriable) without duplicating the logic.
- **Localization works because `errorDescription` goes through `NSLocalizedString`.** This composes with ADR 0009 (i18n).

## Consequences

Positive:

- ViewModels can be unit-tested without running the BFF or holding microphone permission.
- A single `Localizable.strings` table owns user-facing error copy. Translators get one list.
- Telemetry can attach a stable error code (`AppError` case name) regardless of the underlying cause.
- Future transport changes (e.g. WebSocket subscription for scoring status) are absorbed inside the facade.

Negative:

- One additional indirection layer; new endpoints require both a `QuranBackend` method and an `ApolloBackend` implementation.
- Error-translation code at each adapter boundary must be maintained. Mitigation: each adapter has a single `try await mapErrors { ... }` helper.
- The facade is only as good as its cohesion — drift between `ApolloBackend` and the underlying Apollo / REST shapes will manifest as boilerplate. We accept this cost.

## Alternatives Considered

- **Inject `ApolloClient` and `URLSession` directly into ViewModels.** Rejected: leaks transport details and complicates testing.
- **One protocol per endpoint (`SurahsRepository`, `ScoringRepository`, ...).** Rejected at this size: too many tiny protocols for ~6 operations. Reconsider if the surface grows past ~15.
- **Throw raw `Error` everywhere; localise in the View.** Rejected: pushes error reasoning into View bodies and prevents typed retry logic.
- **Use `Result<T, AppError>` return values instead of `throws`.** Rejected: Swift's async `throws` is idiomatic and composes with `try await`.

## Reconsideration Triggers

Re-open when **any** of:

1. The number of operations on `QuranBackend` exceeds ~15 → split into focused repositories.
2. `AppError` accumulates more than ~12 cases → group related cases into nested enums (e.g. `AppError.audio(.recordingFailed(...))`).
3. A second backend (e.g. an offline cache layer) is introduced → consider a Repository / DataSource split rather than a flat facade.

## References

- `apps/ios/Sources/QuranRecitationApp/GraphQL/QuranAPIClient.swift` — current direct Apollo dependency
- `apps/ios/Sources/QuranRecitationApp/RecordingViewModel.swift:17` — current direct instantiation
- `apps/bff/src/rest/rest.ts:225` — the REST `/reference-audio` endpoint
- `schemas/graphql/schema.graphql` — current GraphQL surface (no `referenceAudio` query yet)
- ADR 0005 (architecture) — defines the ViewModel layer that consumes these facades
- ADR 0007 (history persistence) — applies the same protocol-facade pattern
- ADR 0008 (telemetry) — relies on `AppError` cases as stable error labels
