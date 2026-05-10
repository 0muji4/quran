# Android

Compose client for Tilawah. Talks to the BFF (`:4000`) over GraphQL through Apollo Kotlin, with a single REST call for teacher reference audio. Entry point is `apps/android/src/main/java/tv/every/tilawah/android/MainActivity.kt`.

## Prerequisites

- macOS / Linux with Android Studio Hedgehog or newer (or just the Android SDK + JDK 17)
- JDK 17 (Android Studio bundles a JBR; export `JAVA_HOME=$(/usr/libexec/java_home -v 17)` on macOS if you use the system JDK)
- Android SDK 34 + a Pixel 6 / API 34 emulator for manual verification

## Layout

```
src/main/java/tv/every/tilawah/android/
├── app/             AppRoot, AppConfig, AppError, Routing, HistoryDataStore
├── designsystem/    BrandColors, BrandTypography, BrandSpacing, BrandTheme,
│                    components/ (BrandCard, ChipFilter, PlaybackRow,
│                                  PrimaryButton, BrandProgressBar, WaveformView,
│                                  BrandCardStyle)
├── audio/           Recorder + MediaRecorderRecorder, Player + MediaPlayerPlayer,
│                    AudioFocusCoordinator
├── backend/         QuranBackend (interface), ApolloQuranBackend,
│                    ReferenceAudioClient, Dto
├── storage/         HistoryStore (interface), DataStoreHistoryStore,
│                    InMemoryHistoryStore, HistoryDtos
├── telemetry/       Telemetry (interface) + constants, TraceTelemetry,
│                    NoOpTelemetry
└── features/
    ├── library/     LibraryScreen, LibraryViewModel, ContinueCard, SurahRow,
    │                LibraryFilter, LibraryUiState
    ├── practice/    PracticeScreen, PracticeViewModel, PracticeState,
    │                AyahCard, TeacherReferencePanel, RecordingPanel,
    │                AnalysingPanel, PracticeErrorPanel
    ├── result/      ResultDetailScreen, ResultDetailViewModel, ScoreHero,
    │                MetricBars, WordComparisonGrid, ListenBackSection
    └── history/     HistoryScreen, HistoryViewModel, AttemptRow, StatsGrid,
                     HistoryFilter

src/main/graphql/    *.graphql operations consumed by Apollo Kotlin codegen
src/main/res/        values/, values-ar/, xml/network_security_config.xml

src/test/java/tv/every/tilawah/android/
├── backend/         MockBackend, MockBackendTest
├── telemetry/       TelemetrySpy, TelemetrySpyTest
├── storage/         HistoryStoreTest
└── features/        library/{LibraryViewModelTests, LibraryFilterTests}
                     practice/{PracticeViewModelTests, PracticeEndToEndTests}
                     result/ResultDetailViewModelTests
                     history/{HistoryViewModelTests, StatsTests}
```

## Architecture decisions

The shape of the Android app mirrors iOS one-for-one. The architectural commitments live in:

- [`docs/adr/0005`](../../docs/adr/0005-ios-app-architecture.md) — MVVM, TabView (NavigationBar on Android), typed Route enum, state machines
- [`docs/adr/0006`](../../docs/adr/0006-ios-layer-boundaries-and-error-model.md) — protocol facades + unified `AppError`
- [`docs/adr/0007`](../../docs/adr/0007-ios-local-first-history-persistence.md) — local-first `HistoryStore`
- [`docs/adr/0008`](../../docs/adr/0008-ios-observability-via-telemetry-protocol.md) — `Telemetry` protocol backed by Logcat + `androidx.tracing.Trace`
- [`docs/adr/0009`](../../docs/adr/0009-ios-internationalization-from-day-one.md) — i18n from day one (Arabic translation deferred per the 2026-05-09 update)

## Build (Gradle)

```bash
JAVA_HOME=$(/usr/libexec/java_home -v 17) ./gradlew :apps:android:assembleDebug
```

Apollo Kotlin codegen runs automatically as part of `:apps:android:assembleDebug`. The generated sources land under `apps/android/build/generated/source/apollo/` and are not committed.

## Test

```bash
./gradlew :apps:android:lintDebug :apps:android:testDebugUnitTest :apps:android:assembleDebug
```

Instrumented tests are intentionally not in the standard gate (no emulator dependency in CI). Manual emulator validation is the gate for UI changes.

## Endpoints

`AppConfig` is the single source of truth for the BFF URL:

- `BFF_BASE_URL` gradle property / env var (Debug default `http://10.0.2.2:4000` — the Android emulator's alias for the host machine's `localhost`).
- Physical-device development: pass `-PBFF_BASE_URL=http://<host-LAN-IP>:4000` to gradle, or set the env var.
- `network_security_config.xml` permits cleartext only for `localhost` and `10.0.2.2`. Production traffic is HTTPS-only.

## Telemetry

Production wires `TraceTelemetry` (Logcat tag `com.tilawah.android`; `androidx.tracing.Trace` brackets the `measure(...)` regions so they appear in Perfetto / Studio Profiler). The cross-platform event taxonomy lives at [`docs/telemetry.md`](../../docs/telemetry.md).

Inspecting events:

```bash
adb logcat | rg com.tilawah.android
```

## Localization (i18n)

`res/values/strings.xml` is the source of truth. `res/values-ar/strings.xml` ships as an English mirror — the Arabic translation pass is deferred per ADR 0009 (2026-05-09 update). When a native Arabic-speaking translator engages (or when web / analytics force the issue), update the values in place; the keys + manifest `android:supportsRtl="true"` are already in flight.

## Verification (end-to-end)

1. `docker compose up` (BFF + worker + Postgres + Redis + MinIO).
2. Launch the Pixel 6 / API 34 emulator from Android Studio.
3. `./gradlew :apps:android:installDebug`.
4. **Library tab**: surahs load → search "Fatihah" → tap row.
5. **Practice tab**: Teacher reference plays → record 5 s → upload → analysing checklist animates → DonePanel shows the score.
6. **Result detail**: ScoreHero arc + verdict, Accuracy / Fluency / Completeness MetricBars, WordComparisonGrid colored by op, ListenBack rows for teacher + you.
7. **Try again** returns to Practice for the same ayah; **Continue** advances to ayah+1.
8. **History tab**: attempt appears at the top, StatsGrid updates (week / average / best / streak).
9. Force-stop the app, relaunch, repeat step 8 — DataStore persists across process death.
10. **Cross-platform JSON parity**: export DataStore prefs via `adb shell run-as com.tilawah.android cat files/datastore/tilawah-history.preferences_pb` and confirm the `tilawah:*` keys + ISO 8601 dates + `COMPLETED|FAILED` status round-trip with the web `localStorage` and iOS `UserDefaults` shapes.
11. **Telemetry parity**: `adb logcat | rg com.tilawah.android` while exercising the funnel; assert event names match `docs/telemetry.md`.
12. **Error path**: stop the BFF; assert `AppError.network` surfaces with localised user copy; retry recovers.
13. **TalkBack on**: record button announces state, score dial reads "84 percent, mashallah", word tiles announce match / substituted / missing / extra.
14. **ar locale** (Settings → System → Languages → add Arabic, move to top): RTL flips on the Arabic ayah text only; English-mirror copy in `values-ar` remains intelligible until a translator engages.
