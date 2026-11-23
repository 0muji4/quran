# ADR 0032: Web Components on HTML Standard Elements

- Status: Accepted
- Date: 2026-11-23
- Author: motoshi.suzuki
- Related: [ADR 0003](./0003-design-tokens-gold-split.md), [ADR 0004](./0004-visual-regression-playwright.md), [ADR 0020](./0020-amiri-quran-subset.md), [ADR 0022](./0022-panda-css-adoption.md), [ADR 0026](./0026-single-design-token-source.md), [ADR 0030](./0030-platform-standard-components.md)

## Context

The Android and iOS apps were rebuilt on the shared tokens of ADR 0026, with each platform's standard components (ADR 0030). The Web app has not been rebuilt yet:

- Its colours come from the hand-written `packages/ui/src/theme/tokens.ts`: forest green and gold, not the lapis, gold and paper palette the apps now use.
- Its styles are split between CSS Modules (30 files; `practice.module.css` alone is about 1,600 lines) and Panda CSS.
- It has no dark mode.
- Its type is three bundled fonts: Cormorant Garamond for headings, Inter for body text, and Amiri for Quran text.
- Its navigation is a top bar sized for desktop, with tabs for Library, Practice and History.

ADR 0030 lists a reconsideration trigger for this case: the Web redesign needs a rule for Web components. Android and iOS each ship a component library with the operating system. Web does not, so the rule has to say what takes that place.

Three sources of components were considered:

| Source                             | What it gives                                                                                               |
| ---------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| HTML standard elements             | `button`, `input`, `select`, `dialog`, the Popover API, `details`, `progress`, with the browser's behaviour |
| Material Web (`@material/web`)     | Google's Material 3 Web Components; the README says it is in maintenance mode pending new maintainers       |
| A headless library (Ark UI, Radix) | Unstyled React components with keyboard and ARIA behaviour, styled by the app                               |

## Decision

**Web components are built on HTML standard elements and styled with Panda recipes that read the shared tokens. The tokens supply colour, spacing and corner radius; the browser supplies behaviour.**

### Components

- Use the HTML element for each role: `button` and `a` for actions and links, `input` and `select` for form fields, `dialog` for modal dialogs and sheets, the Popover API for menus and toasts, `details` for disclosures, and `progress` for progress.
- Add ARIA only where no element carries the role, following the first rule of ARIA use.
- Style elements through Panda recipes in `packages/ui/src/theme/recipes/`. Shapes follow the Material 3 shape scale and sizes, as on Android: 48px minimum targets for primary controls.
- A custom component is allowed only where HTML has no element: the ayah display and its ornament, the verdict chips, the recording waveform, and the navigation bar and rail.
- No component library is added.

### Tokens

- Stage 2 of the token generator (ADR 0026) gains a Panda output: the colour roles as semantic tokens with a light and a dark value, and the spacing and shape scales.
- Dark mode follows the operating system setting through `prefers-color-scheme`.
- Screens and components read semantic tokens only. Panda's `strictTokens`, which is already on, rejects raw values.

### Layout

- Breakpoints are Material 3's window size classes: compact below 600px, medium from 600px, expanded from 840px, large from 1200px and extra-large from 1600px.
- Navigation is a bottom navigation bar in a compact window and a navigation rail otherwise. This is the default of Android's `NavigationSuiteScaffold`.

### Type

- The type scale is Material 3's, in `rem`, so it follows the browser's text size.
- Headings and body text use the system font stack (`system-ui`). Quran text keeps the bundled Amiri subset (ADR 0020).

## Rationale

- **The browser's elements carry behaviour the app would otherwise copy.** This is ADR 0030's reason, applied to Web. A `button` or a `dialog` comes with keyboard handling, focus management, screen reader semantics and forced-colours support. web.dev advises using semantic HTML elements before ARIA, and the W3C's first rule of ARIA use says the same.
- **HTML now covers most roles that once needed a library.** `dialog`, the Popover API and `details` handle modals, menus, toasts and disclosures, including focus and dismissal, so a headless library would mostly duplicate them.
- **Material Web is not a safe dependency.** Its README says it is in maintenance mode pending new maintainers.
- **One palette everywhere.** Generating the Panda tokens from the same DTCG files ends the period ADR 0026 accepted, in which Web and mobile used different palettes.
- **Navigation that matches the window.** A phone browser gets the same bottom bar as the Android app; a wide window keeps its content area free of a header.
- **System fonts load nothing.** Android and iOS already use the system fonts. Dropping Cormorant Garamond and Inter removes two font downloads from every first visit; only the Amiri subset remains.

## Consequences

Positive:

- Accessibility and browser features come with the elements, at no extra code.
- Web, Android and iOS share one palette and dark mode.
- Fewer bundled fonts and less CSS: the CSS Modules and the old tokens go when the last screen moves.

Negative:

- The app writes the styles for every element itself; there is no ready-made look to start from.
- Some newer HTML features (customisable `select`, anchor positioning) are not in every browser yet. A component that needs one either keeps a fallback or waits.
- Every visual baseline is re-recorded, and the scenes grow to three widths, two colour modes and both text directions.
- ADR 0003's gold split and its type test are retired once the old tokens are deleted.

## Alternatives Considered

- **Material Web.** Rejected: in maintenance mode, and its Web Components need extra wiring in React.
- **A headless library (Ark UI with Park UI, Radix).** Rejected: it adds a dependency for behaviour that the HTML elements above already provide. Reconsider if a needed role has no element (see below).
- **Keep the top bar at every width.** Rejected: on a phone it takes vertical space and puts the tabs out of thumb reach, and it differs from the Android app.

## Reconsideration Triggers

- A role the app needs has no HTML element and the custom version grows beyond a small component (for example a combobox). Re-evaluate a headless library for that role.
- Material Web gets new maintainers, or Google ships another supported Material 3 library for the Web.
- An HTML feature used here is dropped or changed by browsers.

## References

- [#673](https://github.com/0muji4/quran/issues/673): the Web redesign plan
- [ARIA in HTML (web.dev)](https://web.dev/learn/accessibility/aria-html)
- [Using ARIA (W3C)](https://www.w3.org/TR/using-aria/): the first rule of ARIA use
- [Material Web](https://github.com/material-components/material-web): the maintenance notice
- [Use window size classes (Android Developers)](https://developer.android.com/develop/ui/compose/layouts/adaptive/use-window-size-classes)
- [Build adaptive navigation (Android Developers)](https://developer.android.com/develop/ui/compose/layouts/adaptive/build-adaptive-navigation)
