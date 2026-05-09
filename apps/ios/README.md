# iOS

Swift Package + SwiftUI client for Tilawah. Talks to the BFF (`:4000`)
over GraphQL through Apollo iOS, with a single REST call for teacher
reference audio. Entry point is `apps/ios/Package.swift`.

## Prerequisites

- macOS with Xcode 15+ (Swift 5.9)
- iOS 16+ SDK
- `apollo-ios-cli` 1.25.5 (or via `APOLLO_CLI=/path/to/apollo-ios-cli`)

## Layout

```
Sources/QuranRecitationApp/
├── App/             AppRoot, Routing, AppConfig, AppError
├── DesignSystem/    Colors, Typography, Spacing, Components/*
├── Audio/           AudioRecorder, AudioPlayer, AudioSessionCoordinator
├── Backend/         QuranBackend protocol + ApolloBackend impl + ReferenceAudioClient
├── Storage/         HistoryStore protocol + UserDefaults / InMemory impls
├── Telemetry/       Telemetry protocol + OSLog / NoOp impls
├── Resources/       en.lproj / ar.lproj Localizable.strings
├── GraphQL/         .graphql operations + apollo-ios-cli output
└── Features/
    ├── Library/     LibraryView, ContinueCard, SurahRow, ViewModel
    ├── Practice/    PracticeView, AyahCard, TeacherReferencePanel,
    │                RecordingPanel, AnalysingPanel, PracticeErrorPanel,
    │                State, ViewModel
    ├── Result/      ResultDetailView, ScoreHero, MetricBars,
    │                WordComparisonGrid, ListenBackSection, ViewModel
    └── History/     HistoryView, AttemptRow, StatsGrid, ViewModel

Tests/QuranRecitationAppTests/
├── HistoryStoreTests
├── LibraryViewModelTests
├── PracticeViewModelTests
├── MockBackend, TelemetrySpy
```

## Architecture decisions

The shape of the iOS app is documented in five ADRs:

- [`docs/adr/0005`](../../docs/adr/0005-ios-app-architecture.md) — MVVM, TabView, typed Route enum, state machines
- [`docs/adr/0006`](../../docs/adr/0006-ios-layer-boundaries-and-error-model.md) — protocol facades + unified `AppError`
- [`docs/adr/0007`](../../docs/adr/0007-ios-local-first-history-persistence.md) — local-first `HistoryStore`
- [`docs/adr/0008`](../../docs/adr/0008-ios-observability-via-telemetry-protocol.md) — `Telemetry` protocol backed by OSLog
- [`docs/adr/0009`](../../docs/adr/0009-ios-internationalization-from-day-one.md) — i18n from day one

## Build (Xcode CLI)

```bash
xcodebuild \
  -scheme QuranRecitationApp \
  -destination "generic/platform=iOS Simulator" \
  build
```

## Test (Xcode CLI)

`xcodebuild test` requires a concrete simulator destination — the
`generic/...` slug used by `build` does not work.

```bash
xcodebuild \
  -scheme QuranRecitationApp \
  -destination "platform=iOS Simulator,name=iPhone 16,OS=latest" \
  test
```

## Open in Xcode

Open `apps/ios/Package.swift` in Xcode, select the `QuranRecitationApp`
scheme, and run.

## GraphQL code generation

Regenerate Apollo types from `schemas/graphql/schema.graphql`.

```bash
make -C apps/ios codegen         # regenerate
make -C apps/ios codegen-check   # verify generated code is up to date (used in CI)
```

Configuration: `apps/ios/apollo-codegen-config.json`. Generated output:
`apps/ios/Sources/QuranRecitationApp/GraphQL/Generated/`.

## Endpoints

`AppConfig` is the single source of truth for backend URLs:

- `BFF_GRAPHQL_URL` env var (Debug default `http://localhost:4000/graphql`)
- `BFF_REST_URL` env var (Debug default `http://localhost:4000`)

Release builds require explicit env-var overrides until an `.xcodeproj`
layer with `xcconfig` is added (see ADR 0005's notes).

## Telemetry

Production builds wire `OSLogTelemetry` (subsystem
`com.tilawah.ios`). The cross-platform event taxonomy lives at
[`docs/telemetry.md`](../../docs/telemetry.md).
