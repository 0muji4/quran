# ADR 0028: Type on Android and iOS: the Type Scale and an Amiri Subset for Quran Text

- Status: Accepted
- Date: 2026-11-09
- Author: motoshi.suzuki
- Related: [ADR 0009](./0009-ios-internationalization-from-day-one.md), [ADR 0020](./0020-amiri-quran-subset.md), [ADR 0026](./0026-single-design-token-source.md), [ADR 0027](./0027-native-snapshot-tests.md)

## Context

The Android and iOS apps are being redesigned. ADR 0026 migration step 4 rebuilds each screen, one at a time, on a new theme, `AppTheme`, and the components the screens share are rebuilt first. Those components need a type scale in `AppTheme` before they are built. Today both apps define type only in the old theme:

| Platform | Old theme         | Quran text                                             |
| -------- | ----------------- | ------------------------------------------------------ |
| Android  | `BrandTypography` | `FontFamily.Serif` at 32sp: the device's serif font    |
| iOS      | `Font.brand`      | `Font.system(size: 32, design: .serif)`: fixed at 32pt |

Two problems follow:

- **The Quran text is drawn in whatever serif font the device has.** Web draws it in Amiri (ADR 0020), so the same ayah looks different on each platform. The agreed design of the Practice screen draws it in Amiri.
- **On iOS, the Quran text ignores the text size setting.** A fixed point size does not take part in Dynamic Type, so a user who enlarges text gets larger UI copy around an ayah that stays at 32pt.

The agreed design of the Practice screen, an HTML mock linked from the redesign plan [#596](https://github.com/0muji4/quran/issues/596), uses:

- Amiri for the ayah text (34, or 28 for a long ayah) and the ayah number (20), at the regular weight only.
- The platform's own font for everything else, including Arabic UI strings (Noto Sans Arabic on Android, SF Arabic on iOS).
- On iOS, sizes that are Apple's text styles (17, 15, 13, 12). The Amiri sizes 34, 28 and 20 equal iOS `largeTitle`, `title` and `title3`.
- On Android, mostly sizes on Material 3's default type scale (22, 16, 14, 12), plus three sizes that are not on it: 13, 15 and the 48 score. The default scale's sizes are 57, 45, 36, 32, 28, 24, 22, 16, 14, 12 and 11sp, as Compose's `Typography()` defaults report them ([type scale](https://m3.material.io/styles/typography/type-scale-tokens)).

ADR 0026 keeps the type scale per platform, because iOS scales text through Dynamic Type text styles and Android scales `sp` units by the font scale.

## Decision

**Each platform's `AppTheme` exposes its own type scale plus three Quran text styles drawn in a bundled Amiri subset. Only Quran text uses Amiri. The Quran styles follow each platform's own scaling for the system text size, as Google and Apple recommend for app text.**

### The font file

- The source is upstream Amiri 1.001, `Amiri-Regular.ttf` only, as in ADR 0020.
- The subset is the same codepoint set as Web: every codepoint in `db/seed_quran.sql` plus the UI allow-list, which includes the Arabic-Indic digits that the ayah number uses.
- `scripts/build-amiri-quran-subset.sh` gains a TTF output for each app, with the same layout features and the same OFL rename to "Tilawah Amiri Quran". TTF, because Android font resources accept TTF and OTF but not woff2, and iOS registers TTF.
- Each app bundles `OFL.txt` as a resource (Android: `assets/licenses/OFL-amiri.txt`), so the license ships with every copy of the font, as OFL requires.
- The binaries are committed, as in ADR 0020, so app builds need no font tooling.

### Android

- The font is a font resource in `res/font/`.
- `AppTheme.typography` is the Material 3 type scale, backed by `MaterialTheme.typography`, at Material 3's default values.
- `AppTheme.quranTypography` holds the styles Material 3 has no slot for: `ayah` (34sp), `ayahLong` (28sp) and `ayahNumber` (20sp), in the Amiri subset.
- Like every `sp` size, they follow the font scale through the platform's conversion. From Android 14, that conversion is non-linear: large sizes grow less than small ones. Measured with Compose's `LocalDensity` (`16.sp.toPx()`, `34.sp.toPx()`) under Robolectric at SDK 35, density 1 and a 1.3 font scale: 16sp becomes 20.2dp (×1.26) and 34sp stays at 34dp (×1.00). The app does not compute its own linear scale, because Android advises against deriving sizes from `Configuration.fontScale` ([Android 14 features](https://developer.android.com/about/versions/14/features)).

### iOS

- The font is a package resource, registered from `Bundle.module` before the first view is drawn, because the app is a Swift package without an `Info.plist` font list.
- `AppTheme.Typography` holds the type scale: Apple's text styles (`largeTitle` to `caption2`), so that views name type through `AppTheme` as ADR 0009 requires, plus `ayah`, `ayahLong` and `ayahNumber`.
- The Quran styles use `Font.custom(_:size:relativeTo: .body)`, Apple's way to make a custom font take part in Dynamic Type ([Applying custom fonts to text](https://developer.apple.com/documentation/swiftui/applying-custom-fonts-to-text)). Apple scales each text style by its own factor ([WWDC20, The details of UI typography](https://developer.apple.com/videos/play/wwdc2020/10175/)). The ayah is the text the user reads, not a heading, so it takes the factor of `body`, the style for reading text. The fixed 32pt goes away.

### What stays as it is

- The old themes (`BrandTypography`, `Font.brand`) are not changed. Screens get the new type as they move to `AppTheme` in migration step 4, and the old themes are deleted with the rest of the old theme.
- Line height and layout of an ayah (the design uses 1.9 times the font size) belong to the ayah component, not to the type scale.
- A size in a design that is not on its platform's scale (13, 15 and 48 on Android, 48 on iOS) is settled when the component that uses it is built: it takes the nearest role, or the component's pull request argues for a style of its own.

### Verification

Each platform's pull request adds a snapshot test (ADR 0027) of the three Quran styles in all 8 combinations, so the rendered font and its scaling at the large text size are reviewed as images.

## Rationale

- **One Amiri subset for all platforms.** The same source file and codepoint set as Web make an ayah render with the same glyphs everywhere. Reusing ADR 0020's script keeps one regeneration step for all three apps.
- **Amiri for Quran text only.** Amiri is a naskh face for the Quranic text. UI strings stay in the platform font, which is what the design shows, and which keeps UI copy outside the subset's codepoint set.
- **Each platform's scaling curve.** Both platforms shape how text grows with the system setting, and both advise apps to follow that shape rather than replace it: Android through its `sp` conversion, Apple through text styles and `relativeTo`. The ayah follows the same rules as the rest of the screen.
- **`body` as the iOS reference.** Apple ties a custom font to the text style whose role it shares. The ayah's role is reading text, which is `body`'s role, even though its size is that of a title.
- **Apple text styles named through `AppTheme` on iOS.** ADR 0009 requires views to name type through one place. `AppTheme` is that place for the new theme (ADR 0026 layer rule). The text styles are kept as Apple names them, because the iOS scale is Apple's, not Material 3's.

## Consequences

Positive:

- Ayah text looks the same on Android, iOS and Web.
- On iOS, ayah text scales with Dynamic Type by the same factor as body text.
- Components and screens built in migration step 4 take every text style from `AppTheme`.

Negative:

- Each app grows by the size of the TTF subset.
- On Android 14 and later, the ayah grows less than body text, and not at all at a 1.3 font scale. Readers who want a larger ayah than the curve gives have no control for it yet.
- Until a screen moves to `AppTheme`, it still draws Quran text in the device serif font, and on iOS at a fixed size.
- Adding an Arabic glyph to the Quran text still means editing the allow-list and regenerating, now for three outputs.

## Alternatives Considered

- **Full Amiri or upstream Amiri Quran.** Not chosen: both cover far more than the corpus. ADR 0020 already chose the corpus subset for Web.
- **Amiri for all Arabic text, UI strings included.** Not chosen: the design uses the platform font for Arabic UI, and the subset would then have to follow every UI copy change.
- **A shared type scale across platforms as tokens.** Not chosen: ADR 0026 keeps the type scale per platform, because shared point sizes would override Dynamic Type and Android's font scale.
- **Changing the old themes to Amiri now.** Not chosen: the old themes are deleted once the screens move to `AppTheme`, and the change would replace the "before" images ADR 0027 recorded for the Practice rebuild.

## Reconsideration Triggers

- A design uses Amiri at another weight. Add that weight to the script and the Quran styles.
- Arabic UI strings move to Amiri. Extend the subset to the UI copy.
- Upstream Amiri or the Quran corpus changes. Regenerate all three outputs (ADR 0020 triggers).
- Readers ask for a larger ayah than the platform curve gives. Add an in-app ayah size setting, as reading apps such as Quran.com do, rather than replacing the platform curve.

## References

- [ADR 0009](./0009-ios-internationalization-from-day-one.md) Decision 4: central typography and SF Arabic for Arabic. Quran text now uses Amiri; Arabic UI strings stay in SF Arabic.
- [ADR 0020](./0020-amiri-quran-subset.md): the Web subset, its script and OFL handling
- [ADR 0026](./0026-single-design-token-source.md): `AppTheme` and the per-platform type scale
- [ADR 0027](./0027-native-snapshot-tests.md): the snapshot tests that review the result
- `scripts/build-amiri-quran-subset.sh`, `scripts/_extract-quran-codepoints.py`
