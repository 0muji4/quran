# ADR 0030: Platform-Standard Components on the Shared Tokens

- Status: Accepted
- Date: 2026-11-15
- Author: motoshi.suzuki
- Related: [ADR 0026](./0026-single-design-token-source.md), [ADR 0027](./0027-native-snapshot-tests.md), [ADR 0028](./0028-mobile-type.md)

## Context

ADR 0026 gives Android and iOS one token source, and item A4 of #596 rebuilt the shared components on it (`AppButton`, `AppCard`, `AppChip` and others). Those components were drawn from one mockup that gave both platforms the same look. Reviewed against each platform's own components, they depart from the standards in several places:

| Platform | Component            | As built in A4                                  | Platform standard                                  |
| -------- | -------------------- | ----------------------------------------------- | -------------------------------------------------- |
| Android  | Card                 | 28dp corners, no elevation                      | Material 3 cards: 12dp corners, elevated or filled |
| Android  | Chip                 | Pill shape                                      | Material 3 chips: 8dp corners                      |
| Android  | Linear progress      | Gap and stop indicator removed                  | Material 3 linear progress: gap and stop indicator |
| Android  | Record button        | 88dp circle                                     | Material 3 large FAB: 96dp, 28dp corners           |
| Android  | Screen header        | Hand-drawn                                      | Material 3 top app bar                             |
| iOS      | Buttons              | Hand-written `ButtonStyle`                      | `.borderedProminent`, `.bordered`, `.borderless`   |
| iOS      | Progress and spinner | Hand-drawn bars and a turning ring              | `ProgressView`                                     |
| iOS      | Screen header        | Navigation bar hidden, header drawn in the view | The navigation bar of `NavigationStack`            |

A hand-written control has to reimplement what the system control already does: pressed and disabled states, the accessibility settings that change controls (Button Shapes, Increase Contrast, Bold Text), keyboard and pointer focus, and the look of each new OS release, such as iOS 26's glass bars. Each one it misses is a defect only that app has.

The same review found the neutral colours muddy next to the brand blue. ADR 0026 puts the neutrals on a warm paper hue (HCT hue 75, chroma 6 for the neutral palette and 10 for the neutral-variant palette), opposite the lapis primary on the colour wheel. Where a translucent blue is drawn over a warm surface, as iOS `.bordered` buttons are, the two mix towards grey: the button fill on a panel came out as `#DDD8D6`, a greyish mauve.

## Decision

**Components follow each platform's standard components and specifications. The shared tokens supply colour, type and spacing; the platform supplies shapes, sizes and behaviour.**

### Android

- Use the Material 3 component for each role, at its default shape and size: top app bar, elevated card (the main card of a screen), filled card (panels), assist chip, large FAB, linear and circular progress indicators, buttons, icon buttons and navigation bar.
- Override a component's colours only to map an app role that Material 3 has no slot for (recording, verdicts, ornament). Do not override shapes, sizes or elevation.

### iOS

- Use the system control for each role: the navigation bar and toolbar of `NavigationStack`, `TabView`, `Button` with `.borderedProminent`, `.bordered` or `.borderless` and a `controlSize`, `Menu`, and `ProgressView`.
- Apply the brand through `tint` and the colour tokens. Backgrounds, cards and text keep the brand neutrals (ADR 0026), not the system colours.
- A `.borderedProminent` label takes `onPrimary` (or the on-colour of its tint). The system draws it white whatever the tint, and white on the dark-mode primary is 1.7:1, below WCAG AA.
- Containers set no foreground style. A foreground style on a container also recolours the labels of the system buttons inside it, so text sets its own colour.
- Bars and tab bars take the system material, including the glass of iOS 26, with no app-side styling.

### Both

- A custom component is allowed only where neither platform has one: the ayah display and its ornament ring, the verdict chips and the recording waveform.
- The neutrals keep hue 75 at half the chroma: 3 for the neutral palette and 5 for the neutral-variant palette. Only `packages/ui/scripts/tokens/inputs.mjs` changes; the roles regenerate.
- The agreed mockup for Practice is the Design canvas linked from #596. It shows both platforms with these components.

## Rationale

- **Standard controls carry behaviour the app would otherwise copy.** Accessibility settings, state handling and new OS looks come with the control, on every release, at no cost to the app.
- **Users know their platform.** An Android user expects a FAB and 12dp cards; an iOS user expects bordered buttons and a system navigation bar. A look shared across platforms is native to neither.
- **The brand stays in the tokens.** Colour and type are what make the app recognisable, and ADR 0026 already keeps them in one place for both platforms.
- **Half the chroma, same hue.** A colour study compared four settings on the Done state of both platforms: the current neutrals, half the chroma, near-neutral (1.5 / 3), and Material's default of neutrals on the primary hue. Half the chroma keeps the warm paper look and the gold ornament's setting while the blue tint mixes to a cleaner `#DAD8DC`. Material's default removes the warmth entirely.

## Consequences

Positive:

- Screens built on the components get platform behaviour and accessibility without extra code.
- Fewer hand-drawn sizes: a component's size comes from the platform, so fewer values need tokens.

Negative:

- The A4 components are reworked before the Practice screen uses them. Some APIs change or go: the segmented progress (the ayah position is a linear indicator), the error-coloured button variants, and the hand-written iOS button styles.
- Android and iOS look less alike. Screens are compared per platform against the mockup, not with each other.
- Every snapshot that shows a neutral colour is re-recorded when the tokens change.

## Alternatives Considered

- **Keep one custom look on both platforms.** Rejected: it gives up platform behaviour and accessibility for visual sameness that users of one device never see.
- **iOS system colours for backgrounds, cards and text.** Rejected: the warm paper neutrals are part of the brand, and system colours would split the palette that ADR 0026 unified.
- **Material's default neutrals (the primary hue).** Rejected in the colour study: clean, but cold, and the gold ornament loses its setting.

## Reconsideration Triggers

- A platform deprecates a control used here, or ships one for a role that is custom today.
- The Web redesign (ADR 0026 migration step 5) needs a rule for Web components.

## References

- #596: the redesign plan, item A4 and phase B
- [ADR 0026](./0026-single-design-token-source.md): the token source and the neutral hue
- [Material 3 components](https://m3.material.io/components)
- [Apple Human Interface Guidelines: Components](https://developer.apple.com/design/human-interface-guidelines/components)
