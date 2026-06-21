# ADR 0005: iOS App Architecture — MVVM, TabView, Route Enum, State Machine

- Status: Accepted
- Date: 2026-05-09
- Author: motoshi.suzuki

## Context

The iOS app at `apps/ios/Sources/QuranRecitationApp` is at MVP stage: a single SwiftUI screen (`RecorderView`) backed by one `@MainActor` `RecordingViewModel`, an `AudioRecorder`, and an Apollo-based `QuranAPIClient`. The target design (see `docs/design/iOS *.png`) requires six screens organised under three bottom tabs (Library, Practice, History) with a Library → Practice → Result drill-down. Current state is far below the target; the question is what overall shape the app should grow into.

Status text in the current `RecordingViewModel` is a `String` (`"Idle"`, `"Recording"`, `"Uploading"`, `"Scoring"`, `"Completed"`, `"Failed"`) compared in `statusColor` via raw string switches — fragile and not exhaustively checked by the compiler. As the practice flow grows to include `analysing(step:)` and typed errors, this pattern will not scale.

## Decision

The iOS app adopts the following architecture, all on iOS 16+:

1. **MVVM with `ObservableObject` ViewModels.** Each screen has a `@MainActor final class FooViewModel: ObservableObject` that exposes `@Published` state and async methods. ViewModels receive their dependencies (backend, audio, storage, telemetry) via initializer injection.
2. **`TabView` shell with one `NavigationStack` per tab.** Three tabs: Library, Practice, History. Each tab owns its own `NavigationPath`.
3. **Typed routing via a `Route` enum** stored in each tab's `NavigationPath`. Practice → Result navigation is `path.append(.result(jobId: ...))`. Cross-tab jumps (e.g. Library Continue card → Practice ayah) flip the selected tab and rewrite that tab's path.
4. **Domain state machines as enums.** Concretely, `enum PracticeRecordingState { case idle, recording(meters: [Float], duration: TimeInterval), uploading, analysing(step: AnalysingStep), done(ScoringResult), error(AppError) }`. View bodies switch on the state; the compiler enforces exhaustiveness.
5. **Tests for ViewModels only.** XCTest target in `Package.swift`, mocks for each injected protocol. UI is verified manually in the iOS Simulator. Snapshot testing is deliberately not introduced.

## Rationale

- **MVVM is the path of least resistance from the current code.** The codebase is already MVVM in miniature; growing it requires no rewrite, no learning curve, and no new dependencies. The composition-based alternatives (TCA, Redux-style stores) impose a learning tax and a dependency surface that is not justified at the current size.
- **iOS 17 `Observation` is rejected** because it would push the deployment target up and provides no functional capability the project actually needs.
- **`TabView` matches the design.** The mockups place a three-tab bar at the bottom on every screen. A custom bottom bar would be more code for no design fidelity gain.
- **`NavigationStack` + typed `Route` enum** is the iOS 16+ canonical pattern. Storing a `NavigationPath` per tab keeps tab states independent (a user can drill into Library, switch to History, and return to find Library still drilled in).
- **State enums replace stringly-typed status.** The current `statusText == "Recording"` pattern is unsound — typos, locale changes, and new states break silently. An enum with associated values lets the View switch exhaustively and makes invariants like "meters only exist while recording" type-enforced.
- **ViewModel-only XCTest** keeps the test surface honest: state transitions, error paths, and side effects on the storage / telemetry seams are covered without paying for snapshot infrastructure or UI test flakiness. The single-engineer context cannot afford brittle tests.

## Consequences

Positive:

- Zero new runtime dependencies. Apollo iOS remains the only third-party package.
- Each screen is independently testable through its ViewModel. New screens follow the same recipe.
- Routing is type-checked end-to-end. Adding a new destination is a `Route` case, a path append, and a switch arm.
- The state-machine pattern naturally absorbs new states (e.g. a future `paused` recording state) without churning existing code.

Negative:

- Manual dependency injection at the composition root (`AppRoot`). Tolerable for ~5 ViewModels; a DI container would be added if the app grew to ~20+.
- `ObservableObject` boilerplate is more verbose than `@Observable` (iOS 17). Re-evaluate when iOS 16 is dropped.
- No automated visual regression coverage. Visual changes must be reviewed by eye in the Simulator.

## Alternatives Considered

- **The Composable Architecture (TCA).** Rejected: large dependency, steep learning curve, designed for app-wide event composition that does not exist at this size. Premature.
- **iOS 17 `Observation` (`@Observable`).** Rejected on deployment-target grounds. Reconsider when minimum target moves to iOS 17.
- **Single `NavigationStack` with custom tab bar.** Rejected: more code, less native feel, breaks the "back button per tab" expectation.
- **MV / SwiftUI-only with no ViewModel.** Rejected: makes the network and audio side effects untestable without UI machinery.
- **Snapshot tests via `swift-snapshot-testing`.** Deferred: visual UI is faster to verify by hand at this stage; the dependency and CI pipeline cost is not yet justified.

## Reconsideration Triggers

Re-open this decision when **any** of the following hold:

1. Minimum deployment target moves to iOS 17 → evaluate `@Observable` migration.
2. Number of ViewModels exceeds ~15 and manual DI wiring becomes a churn source → consider a small DI container (`Factory`, `Resolver`) or modularise via SPM products.
3. UI regressions repeatedly slip past manual review → introduce snapshot testing for the most-changed screens.
4. Cross-tab event flows (e.g. a recording-complete toast on the Library tab) become common → evaluate TCA or a shared event bus.

## References

- `apps/ios/Sources/QuranRecitationApp/QuranRecitationApp.swift` — current single-screen entry point
- `apps/ios/Sources/QuranRecitationApp/RecordingViewModel.swift:9-32` — current string-based status pattern
- `docs/design/iOS *.png` — six-screen target design
- Project engineering principles — guidance on avoiding unnecessary abstraction
