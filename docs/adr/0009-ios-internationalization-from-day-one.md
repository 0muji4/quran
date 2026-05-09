# ADR 0009: iOS Internationalization — `LocalizedStringKey` From Day One

- Status: Accepted
- Date: 2026-05-09
- Author: motoshi.suzuki

## Context

Tilawah is a Quranic-recitation product. The two languages of its user base are English (UI / explanations) and Arabic (ayah text and, in the long run, full UI). The current iOS implementation has zero localization infrastructure: every string in `RecorderView` (`"Surah ID"`, `"Start Recording"`, `"Stop & Score"`, etc.) is a Swift string literal hard-coded into the View body.

Retrofitting internationalization into a SwiftUI codebase is painful: every `Text("...")` call has to be revisited, every error message extracted, every accessibility label localized, and every test fixture updated. The web app and Android app will eventually need the same posture; iOS is the cheapest place to set the pattern correctly because the codebase is small.

## Decision

From the first iOS rebuild PR forward:

1. **Every user-visible string is referenced via a `LocalizedStringKey`.** Concretely: `Text("practice.recording.cta")` in View bodies; `NSLocalizedString("error.network.title", comment: "...")` in non-View code (e.g. `AppError.errorDescription`).
2. **Two `.lproj` bundles ship from day one**: `Resources/en.lproj/Localizable.strings` (the source of truth) and `Resources/ar.lproj/Localizable.strings` (initially mirrors English; real translations land in a follow-up PR — see PR 25 in the parity-rebuild plan).
3. **Arabic text honours RTL.** `Text(ayah.textAr).environment(\.layoutDirection, .rightToLeft)`. SwiftUI's environment propagation handles cascading layout flips. The English UI shell remains LTR; only the ayah Text and the Arabic-locale full-app mode are RTL.
4. **Typography distinguishes the scripts.** Latin copy uses SF Pro (system); Arabic uses SF Arabic (system fallback). Definitions live in `DesignSystem/Typography.swift` and screens reference `.font(.brand.arabic)` / `.font(.brand.bodyEn)` — no `.font(.system(.body))` literals in feature code.
5. **`AppError.errorDescription`** is `NSLocalizedString`-backed so user-visible error copy is owned by the same `Localizable.strings` table as the rest of the UI.
6. **`Package.swift` declares `.process("Resources")`** so SPM bundles the `.lproj` directories correctly.

## Rationale

- **Retrofitting i18n is the most-frequently-cited "we should have done this earlier" decision in iOS codebases.** The marginal cost of `Text("key")` over `Text("Literal")` is ~zero at write time and saves a full View pass later.
- **Arabic is not optional for this product.** Even if the first ar translations are placeholder, the *infrastructure* must exist: bundles, fonts, RTL handling, error-message localization. Writing the View bodies with hard-coded English now means rewriting them later.
- **`LocalizedStringKey` is SwiftUI-native.** No third-party library needed. Xcode tooling exports `Localizable.strings` to localizers cleanly.
- **Centralised typography** prevents font drift and makes a future "switch Arabic font" change a one-line edit.
- **Errors deserve the same care as UI copy.** Pushing `AppError.errorDescription` through `NSLocalizedString` means no path produces an unlocalizable user string.

## Consequences

Positive:

- Translators receive a single `Localizable.strings` table instead of a code archeology project.
- Switching iOS language in Settings → General → Language flips the entire UI without rebuild.
- RTL bugs surface during normal development because the ayah Text always renders RTL.
- `AppError` copy is reviewable in one file and localizable through the same pipeline.

Negative:

- Slightly more upfront ceremony: every new screen needs keys added to `Localizable.strings` alongside Swift code.
- Diff hygiene: PRs that introduce text must include the `.strings` updates, otherwise `Text("key")` shows the raw key in production. Mitigated by code review and (later) a CI check that flags missing keys.
- Ar translations will lag behind English copy until a translator engages. Acceptable: `Localizable.strings` falls back to the development language (English) per Apple's bundle resolution.

## Alternatives Considered

- **Hard-code English now, internationalize later.** Rejected for the reason described in Rationale: deferral is the high-cost path.
- **Third-party i18n library (e.g. SwiftGen for type-safe keys).** Rejected for now: an extra dependency to gain compile-time safety on string keys is not yet worth it. SwiftGen can be layered on later without changing the View bodies.
- **Translate ar in the same PRs as feature work.** Rejected: blocks features on translator availability. Decoupling lets feature PRs ship with English copy and Arabic land in batched translation PRs.
- **Skip Arabic entirely until product validates demand.** Rejected: validating without ar runs the risk of validating the wrong product (the audience reading Arabic ayahs is the audience the app is built for).

## Reconsideration Triggers

Re-open when **any** of:

1. A third language is added (e.g. Indonesian, Urdu) → consider SwiftGen for compile-time key safety.
2. Translators consistently report key-collision or context-loss problems → switch to a structured translation format (XLIFF round-trip from Xcode is already supported).
3. RTL layout bugs accumulate → add an RTL-locale screenshot test suite.
4. Accessibility audit reveals localized accessibility labels missing → audit ensures every `accessibilityLabel(...)` uses `LocalizedStringKey`.

## References

- `apps/ios/Sources/QuranRecitationApp/QuranRecitationApp.swift:23` — current hard-coded English literals
- `apps/ios/Sources/QuranRecitationApp/RecordingViewModel.swift:21-31` — current English-only status strings
- ADR 0006 — `AppError.errorDescription` is the localized error contract
- ADR 0008 — telemetry events use stable English identifiers; only user-facing strings are localized
- Apple Human Interface Guidelines — Right-to-left support
