# ADR 0026: One Design Token Source for Web, Android and iOS

- Status: Accepted
- Date: 2026-11-08
- Author: motoshi.suzuki
- Related: [ADR 0003](./0003-design-tokens-gold-split.md), [ADR 0004](./0004-visual-regression-playwright.md), [ADR 0014](./0014-ci-path-scoped-workflows.md), [ADR 0022](./0022-panda-css-adoption.md), [ADR 0025](./0025-grpc-between-bff-and-backend.md)

## Context

A design token is a named design value, such as a colour or a spacing step, that UI code references instead of a raw literal. Tilawah defines its tokens three times, by hand:

| Platform | Definition                                                                       |
| -------- | -------------------------------------------------------------------------------- |
| Web      | `packages/ui/src/theme/tokens.ts` (Panda CSS, ADR 0022)                          |
| Android  | `apps/android/.../designsystem/BrandColors.kt`, `BrandSpacing.kt`                |
| iOS      | `apps/ios/Sources/QuranRecitationApp/DesignSystem/Colors.swift`, `Spacing.swift` |

Each file was derived separately from its own platform's PNG mockups in `docs/design`, so the values have drifted apart. The table compares tokens that play the same role on each platform:

| Role                 | Web                   | Android               | iOS       |
| -------------------- | --------------------- | --------------------- | --------- |
| Page background      | `#f5f0e5`             | `#F7F3EC`             | `#F5EFE2` |
| Gold surface         | `#b8893c`             | `#C0894A`             | `#C0894A` |
| Gold text on dark    | `#d9b26a`             | `#D9B26A`             | missing   |
| Strong text          | `#1f1a14`             | `#1A1311`             | `#1A1311` |
| Text on dark surface | `#efe4ce`             | `#F7F3EC`             | `#F5EFE2` |
| Mint surface / ink   | `#d9efe3` / `#2d5a4f` | `#E4EEEB` / `#164842` | missing   |
| Corner radii         | 6 / 10 / 14 / 20      | 10 / 14 / 16          | 16        |

The drift has already produced an accessibility defect. ADR 0003 requires dark text on the gold surface, because white on gold fails WCAG AA. Android follows the rule, but iOS `PrimaryButtonStyle` draws its accent button label in white, at 3.04:1 on `#C0894A`. The ADR 0003 tokens were added only to Web and Android, so iOS had no token that pointed to the right choice. Comments asking for manual sync did not prevent any of this.

The Android and iOS apps are about to be redesigned, and the current visual design does not need to be preserved. The redesign adds two requirements that the hand-written files cannot meet well:

- Dark mode ships with the redesign, so every colour needs a light and a dark value.
- Android should use Material 3 components as they are. Today `BrandTheme` maps brand colours onto only 11 Material colour roles, so Material components fall back to default colours for the rest.

The repository already handles a similar problem for the backend API. ADR 0025 generates Go and TypeScript code from one Protocol Buffers schema, commits the output, and fails CI through `make proto-check` when the output is stale.

## Decision

Design tokens are defined **once, as data**, and each platform reads **code generated from that data**. The new token set is designed from scratch for the redesign. Current values are not carried over.

### Layers

The design system is split into six layers. **Each layer reads only the layer directly below it.**

| Layer                     | Holds                                                                                                                               | Location                                                             | Edited    |
| ------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------- | --------- |
| 1. Design inputs          | Seed colours, chroma limits, the spacing steps and the shape scale                                                                  | `packages/ui/scripts/tokens/inputs.mjs`                              | By hand   |
| 2. Primitive tokens       | Raw values: tonal palettes (`color.palette.<palette>.<tone>`) and a px scale (`dimension.<px>`)                                     | `packages/ui/tokens/primitive/`                                      | Generated |
| 3. Semantic tokens        | Usage names: colour roles per mode (`color.role.<role>`), `spacing.<step>` and `shape.<size>`, written only as aliases into layer 2 | `packages/ui/tokens/semantic/`                                       | Generated |
| 4. Platform tokens        | Layer 3 as code: `ColorTokens` and `DimensionTokens` in Kotlin and Swift                                                            | `designsystem/generated/` (Android), `DesignSystem/Generated/` (iOS) | Generated |
| 5. Theme binding          | The framework wiring: an `AppTheme` composable over `MaterialTheme` on Android, an `AppTheme` namespace on iOS                      | Each platform's design system                                        | By hand   |
| 6. Components and screens | UI                                                                                                                                  | Each platform                                                        | By hand   |

The dependency rule has three practical consequences:

- A semantic token never holds a raw value, so every colour and size has exactly one definition in layer 2.
- Platform code contains layer 3 only. A component cannot reach a palette tone such as `palette.primary.40` and bypass the role that names its purpose.
- Screens read tokens through the theme binding, never from the generated code directly. Dark-mode switching and framework wiring therefore live in one place per platform.

Two generator stages produce layers 2–4, and the DTCG files between them are the contract:

```
layer 1  inputs.mjs
           │  stage 1: generate-source.mjs  (Material Color Utilities, contrast check)
           ▼
layer 2  tokens/primitive/   ◀── aliases ──  layer 3  tokens/semantic/
                                                  │  stage 2: build-platforms.mjs  (Style Dictionary)
                                                  ├──▶ layer 4  ColorTokens.kt, DimensionTokens.kt
                                                  │      └──▶ layer 5  AppTheme ──▶ layer 6  Compose screens
                                                  ├──▶ layer 4  ColorTokens.swift, DimensionTokens.swift
                                                  │      └──▶ layer 5  AppTheme ──▶ layer 6  SwiftUI views
                                                  └──▶ Panda token object ──▶ apps/web (after the Web redesign)
```

Inside `packages/ui/scripts/tokens/`, modules are split by responsibility, and only the entry points and the read/write modules touch the file system:

| Module                                       | Responsibility                                                                   |
| -------------------------------------------- | -------------------------------------------------------------------------------- |
| `inputs.mjs`                                 | Layer 1 data                                                                     |
| `roles.mjs`                                  | The role vocabulary: Material 3 roles, app-specific role mapping, contrast pairs |
| `palette.mjs`                                | Computation: palettes and role resolution                                        |
| `contrast.mjs`                               | Validation: WCAG AA check                                                        |
| `dtcg.mjs`                                   | Serialisation to layers 2 and 3                                                  |
| `load.mjs`                                   | Reading layer 3 through Style Dictionary                                         |
| `kotlin.mjs`, `swift.mjs`                    | Rendering layer 4                                                                |
| `output.mjs`                                 | Writing generated directories                                                    |
| `generate-source.mjs`, `build-platforms.mjs` | Entry points for stages 1 and 2                                                  |

### Choices

| Concern                | Choice                                                                                                                                                                      |
| ---------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Token format           | JSON in the [Design Tokens Community Group (DTCG)](https://www.designtokens.org/) format                                                                                    |
| Colour roles           | The [Material 3 colour roles](https://m3.material.io/styles/color/roles) (`primary`, `onPrimary`, `primaryContainer`, `surfaceContainer`, …) on every platform              |
| App-specific roles     | Added only where Material 3 has no role: `recording`, the scoring verdicts (`pass` / `warn` / `fail`, each with `on…` and `…Container` roles) and the decorative `ornament` |
| Brand seeds            | Primary `#1E4F91` (lapis blue), tertiary `#B8893C` (illumination gold), neutrals on a warm paper hue (HCT hue 75)                                                           |
| Palette generation     | [Material Color Utilities](https://github.com/material-foundation/material-color-utilities), Tonal Spot variant                                                             |
| Contrast check         | Stage 1 fails when a text/background role pair is below 4.5:1 in either mode                                                                                                |
| Shape scale            | Corner radii use the Material 3 shape scale names (`extraSmall` … `extraLarge`); pill shapes use each platform's fully rounded shape                                        |
| Colour modes           | Every semantic colour has a light and a dark value; stage 2 fails when one is missing                                                                                       |
| Platform build         | [Style Dictionary](https://styledictionary.com/) reads and resolves the DTCG files; both stages run with `make tokens-gen`                                                  |
| Web output             | The Panda token object; Web switches to it when Web is redesigned (see Migration)                                                                                           |
| Android dynamic colour | Off; the app always uses the brand palette, not wallpaper-derived colours                                                                                                   |
| Generated files        | Committed; `make tokens-check` fails when they are stale, and runs whenever an input, a token file or a generated file changes (ADR 0014)                                   |
| Shared token kinds     | Colour, spacing and corner radius                                                                                                                                           |
| Per-platform kinds     | Type scale, minimum tap target (48dp / 44pt) and elevation stay in each platform's own code                                                                                 |

## Rationale

### 1. Generation instead of review

The drift above built up while every file carried comments asking for manual sync. Generation turns a "remember to update the other two" rule into a build-time fact, because a token missing on one platform cannot exist when all platforms read the same source. Dark mode makes this more important: two values per colour across three platforms is six hand edits per change.

### 2. Material 3 colour roles as the semantic layer

ADR 0003 introduced usage-axis names (`gold.surface`, `gold.onLight`) so that each background token comes with a matching text token. Material 3 colour roles apply the same idea to the whole palette: each role such as `primaryContainer` has a paired `onPrimaryContainer`, in both light and dark. Using them brings three benefits:

- Android binds the tokens straight into `MaterialTheme.colorScheme`, so every Material component uses brand colours without a mapping layer.
- The role names are widely documented, so a contributor does not need to learn an in-house naming scheme.
- iOS uses the same names, so a design decision reads the same on both platforms.

Roles are added only where Material 3 has nothing suitable. This keeps the vocabulary small and avoids a second, competing set of names.

### 3. Palettes generated from seed colours

Material Color Utilities builds each tonal palette in the HCT colour space, where a fixed tone difference between two colours gives a predictable contrast ratio. The Material 3 roles are defined as tone pairs that meet WCAG AA in both light and dark, so a palette built this way starts out passing. Hand-picking dozens of light and dark values, as the current files do, gives no such starting point. Colour changes are made to the seeds and chroma limits in `inputs.mjs`, not to the JSON, so a regenerated file never loses a hand edit. Stage 1 also checks every text/background pair, so a change that breaks WCAG AA fails before it reaches any platform.

The app-specific roles reuse the tones of a Material 3 role on their own palette. For example, `passContainer` uses the tones of `primaryContainer` on the pass palette. Each one therefore has the same contrast as the Material role it copies. `ornament` is the exception: it is a mid-tone gold for rules and borders, and it never carries text or meaning.

### 4. DTCG JSON in `packages/ui`

`packages/ui` already owns the Web tokens, so the source stays in the package that publishes design assets. JSON is language-neutral, so no platform has to run another platform's code to read it. DTCG is the format that Style Dictionary and design-tool exporters (for example Figma Variables plugins) read. ADR 0003 names a design-tool or Style Dictionary source as its reconsideration trigger, and this ADR meets that trigger.

### 5. Generated values, hand-written theme

Compose and SwiftUI deliver theme values differently. Compose uses `MaterialTheme` and `CompositionLocal`, and SwiftUI uses environment values and dynamic colours. Generated values plug into those mechanisms; the wiring itself stays in idiomatic platform code. A generator that also emitted the wiring would have to follow both frameworks' theming APIs.

### 6. Committed output

Committed output means Gradle and Xcode builds do not need Node or Style Dictionary installed. Reviewers also see each value change as a diff in Kotlin and Swift. This is the same trade-off ADR 0025 made for generated protobuf code, and `make tokens-check` mirrors `make proto-check`.

### 7. One-way layers

Each layer boundary separates things that change for different reasons:

- **Inputs and tokens.** A designer edits a handful of decisions in layer 1 instead of dozens of generated values. The DTCG files are the contract between the two stages, so a design-tool export can later replace stage 1 without any change to stage 2.
- **Primitive and semantic.** A value lives in one place in layer 2, and layer 3 says what it is for. Retuning a palette tone changes every role that uses it, and renaming a role does not touch any value. This is the separation ADR 0003 started with the gold split.
- **Semantic and platform.** Generating layer 3 only keeps palette tones out of the apps, so the role names stay the only colour vocabulary in UI code.
- **Platform tokens and screens.** The theme binding is the one place that picks light or dark values and feeds them to Compose or SwiftUI. Screens that read generated values directly would each need their own mode handling.

Inside the scripts, the same reasoning keeps pure computation apart from I/O. Palette resolution, the contrast check and the renderers take values and return values, so each one can be read and changed without the file layout in mind.

### 8. Colour, spacing and radius only

These three kinds mean the same thing on every platform. Type scale does not. iOS scales text through Dynamic Type text styles, while Android scales `sp` units by the system font scale. Sharing point sizes would override those mechanisms. Tap-target size and elevation are platform guidelines rather than brand decisions, so they also stay local.

## Consequences

Positive:

- A token change is one edit, and CI rejects any platform that falls behind.
- Dark mode is part of the token set from the first release of the redesign.
- Material 3 components on Android use the brand palette in every role, not just the 11 roles mapped today.
- A design tool can later replace stage 1 by exporting DTCG JSON into `packages/ui/tokens/`, with no change to stage 2.

Negative:

- Until Web is redesigned, Web keeps its hand-written `tokens.ts`, so Web and mobile use different palettes for that period.
- iOS uses Material role names, which are not Apple terminology. iOS contributors need the Material 3 role reference to read them.
- Style Dictionary, Material Color Utilities and a token-check step are new build dependencies for the monorepo.
- The native apps have no visual regression test yet, so a token change on mobile is only reviewed by eye until native snapshot tests exist.

## Migration

Each step is one pull request:

1. Add layers 1–4, both generator stages and `make tokens-check`. Nothing reads the output yet.
2. Android: add layer 5, an `AppTheme` over the generated colour schemes, next to the current `BrandTheme`.
3. iOS: add layer 5, an `AppTheme` namespace over the generated tokens, next to the current `Color.brand`.
4. Move each redesigned screen to the new theme as it is rebuilt. Delete `BrandTheme`, `BrandColors` and `Color.brand` once no screen references them.
5. Web: generate the Panda token object and replace the hand-written `tokens.ts` as part of the Web redesign.

## Reconsideration Triggers

- A design file becomes the source of truth for tokens. Replace stage 1 with an export from it into `packages/ui/tokens/`, and retire `inputs.mjs`.
- A platform needs a deliberate brand deviation, such as a different accent on Android. Add a per-platform override to the source rather than editing generated code.
- Material 3 changes its colour roles in a way that conflicts with iOS conventions. Re-evaluate whether iOS keeps the Material names or gets its own semantic layer.
- Shared UI code across platforms (for example Compose Multiplatform) is adopted. Shared components would then read tokens directly, and the per-platform theme binding may no longer be needed.

## Alternatives Considered

- **Keep hand-written files and add a value-comparison check.** Rejected: a check detects drift but does not stop names from diverging, and each change would still take six edits with dark mode.
- **An in-house semantic naming scheme extended from ADR 0003.** Rejected: it would need its own documentation and a mapping onto Material roles on Android, which is the layer this ADR removes.
- **Use `tokens.ts` as the source with a custom generator.** Rejected: TypeScript is code, not data, so reading it needs a Node runtime, design tools cannot import it, and the custom generator would be maintained in-house.
- **Android dynamic colour.** Rejected: wallpaper-derived colours replace the brand palette and would differ from iOS, which has no equivalent.
- **Make Figma the source of truth now.** Rejected for now: no Figma file holds token variables today. This is listed as a reconsideration trigger.

## References

- `packages/ui/src/theme/tokens.ts`: the current Web tokens
- `apps/android/src/main/java/com/tilawah/android/designsystem/BrandTheme.kt`: the current Material 3 mapping
- `apps/ios/Sources/QuranRecitationApp/DesignSystem/Colors.swift`: the current iOS colours
- `apps/ios/Sources/QuranRecitationApp/DesignSystem/Components/PrimaryButtonStyle.swift`: the white-on-gold accent label
- `Makefile` `proto-check`: the drift-check pattern this ADR reuses
