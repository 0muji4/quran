# ADR 0022: Panda CSS as the web design system

- Status: Accepted
- Date: 2026-05-16
- Author: motoshi.suzuki

## Context

`apps/web` shipped its initial design surface as a hand-rolled stack: a
single `globals.css` defining 44 CSS custom properties under `:root`,
plus five route-scoped CSS Modules (`nav`, `history`, `library`, `auth`,
`practice`). The vocabulary had grown organically — `.btnGhost`,
`.btnTeal`, `.btnGold`, `.navBtn` lived in four separate stylesheets;
`.panel` / `.badge` / `.title` patterns were re-implemented per file —
and `packages/ui` was a placeholder containing one inline-styled
component (`SegmentHighlights`).

The most fragile part of the stack was [ADR 0003](./0003-design-tokens-gold-split.md):
the gold token was split into `gold.surface` / `gold.onLight` /
`gold.onDark` axes precisely so future authors are forced to pick the
correct contrast pairing, but enforcement relied entirely on human
review. With a solo maintainer ([[project_solo_maintainer]]) and no
required reviewer, that discipline was at structural risk — a single
slip back to a hypothetical bare `gold` token would silently degrade
WCAG compliance.

## Decision

1. **Adopt Panda CSS** as the design system layer for `apps/web` and
   `packages/ui`. Pin to `@pandacss/dev@^1.11.x`. PostCSS-plugin
   integration with Next 15 (Webpack — `--turbo` deferred until the
   plugin's Turbopack support has more mileage in production).

2. **Single Panda configuration lives in `apps/web/panda.config.ts`.**
   The first migration attempt placed it in `packages/ui`; the Panda
   PostCSS plugin walks up from each CSS file looking for a sibling
   `panda.config.*` and would never find a config in another workspace
   package. `apps/web` owns the codegen output (`styled-system/` —
   gitignored, regenerated on `pnpm codegen`).

3. **`packages/ui` is the design system vocabulary.** Tokens live in
   `packages/ui/src/theme/tokens.ts`, recipes in
   `packages/ui/src/theme/recipes/`, and the global @keyframes catalogue
   in `packages/ui/src/theme/global-css.ts`. `apps/web`'s `panda.config.ts`
   imports them via the `@quran-project/ui` package's `./theme/*`
   exports. No styled-system codegen happens inside `packages/ui`.

4. **`strictTokens: true` and `strictPropertyValues: true` are
   non-negotiable.** ADR 0003's gold-axis discipline is upgraded from a
   review check to a compile-time invariant: `colors.gold` deliberately
   has no `DEFAULT` axis, so `css({ color: 'gold' })` is a TypeScript
   error. A typecheck-only test
   (`apps/web/test/adr-0003-axis.test-d.ts`) uses
   `@ts-expect-error` to ensure CI flags any future relaxation of that
   type.

5. **`globals.css` is wrapped in `@layer base`.** Panda emits its
   styles under `@layer reset, base, tokens, recipes, utilities` (in
   that cascade order). Without wrapping globals.css, its unlayered
   `h2 { color: ... }` / `a { color: inherit }` rules would beat any
   `@layer` rule, silently overriding recipe colours and triggering a11y
   contrast violations on dark surfaces. The wrap moves them into
   `@layer base`, after which recipes naturally win the cascade.

6. **`apps/web/app/styles/practice.module.css` is intentionally
   permanent.** It is 27 KB, owns three `@keyframes` (`pulseDot`,
   `pulseRing`, `spin`), eight breakpoints, and two
   `prefers-reduced-motion` blocks driving the waveform / recorder /
   analysing UI. Migrating it to Panda's `css()` would shred the
   readability of the most pixel-tuned screen in the app for zero
   functional benefit. It sources every value from Panda's emitted CSS
   variables (`var(--colors-*)` / `var(--spacing-*)` / etc.) instead of
   the now-removed `:root` token block, so the single source of truth
   for design tokens (`packages/ui/src/theme/tokens.ts`) still holds.

7. **Single token source.** `globals.css` no longer defines tokens
   under `:root`. Panda emits the identical-valued CSS variables under
   its own `:root` rule (via `@layer tokens`). Every consumer
   (`practice.module.css`, the SVG icon files, `globals.css` internal
   selectors like `h2` / `.eyebrow`) references the Panda-emitted form
   (`--colors-X`, `--spacing-X`, `--radii-X`, `--shadows-X`,
   `--fonts-X`). The legacy `--color-` / `--space-` / `--radius-` /
   `--shadow-` / `--font-{serif,sans,arabic}` names are retired.

## Rationale

- **`strictTokens` over Tailwind's arbitrary-value escape hatch.** The
  ADR 0003 discipline is the entire reason we picked Panda; Tailwind's
  `bg-[#hex]` syntax would re-open the door this ADR exists to close.
- **Zero-runtime CSS-in-TS.** Recipe and pattern classes are
  build-time atomic CSS — no JS runtime cost, no hydration mismatch
  risk, no `'use client'` boundary added by the styling layer.
- **Slot recipes match this app's anatomy.** The `panel` slot recipe
  (`root / badge / title / subtitle / body / footer`) covers Continue,
  Suggested, the auth brand panel, and `practice.module.css`'s `.panel`
  with one definition that consumers compose via `cx()` for per-instance
  overrides.
- **Escape hatches are explicit, not silent.** The migration uses
  Panda's bracket-escape syntax (`'[transparent]'`, `'[0]'`,
  `'[rgba(232, 217, 184, 0.4)]'`) for one-off values that don't earn a
  token. Each bracket is visible in code review, unlike a free-text
  Tailwind class, and graduates to a real token only when a second
  consumer needs the same value.

## Consequences

### What changed

- 4 of 5 CSS Modules deleted (`nav` / `history` / `library` / `auth`);
  every component now owns its styles via Panda `css()` / recipes.
- `packages/ui` is a real shared package: `tokens.ts` + 3 recipes +
  `global-css.ts` + `SegmentHighlights` (the last component finally
  off hand-picked hex values, now on `score.{pass,warn,fail}` tokens).
- `apps/web/package.json` scripts route `dev` / `build` / `analyze` /
  `typecheck` / `lint` / `test` through `pnpm codegen` (which runs
  both `panda codegen` and `panda cssgen`) so a fresh `pnpm install`
  has everything tsc needs without a separate setup step.
- `apps/web/Dockerfile`'s `deps` stage is **not** subject to a
  `prepare` hook — the codegen step lives in the build scripts only,
  so the cached `pnpm install --frozen-lockfile` layer stays
  config-free.

### What this does not change

- **`practice.module.css` stays.** Future work on the practice page
  uses Panda for new chrome and the CSS Module for anything that
  belongs to the existing waveform / recorder pixel work.
- **Global utility classes in `globals.css`** (`.eyebrow`, `.muted`,
  `.skip-link`, `.sr-only`, `.page-shell`, `.divider`, `.status`,
  `.ar-text`, `.pill`) are kept because they are referenced via plain
  `className="…"` in TSX from multiple call-sites and have no Panda
  equivalent yet. They can graduate to recipes incrementally; nothing
  forces it.

### Escape-hatch policy

- `strictTokens: true` rejects raw hex / px / CSS keywords. Use a
  Panda token first. If no token fits and the value won't recur,
  wrap it in `[…]`:
  - `color: '[inherit]'` for CSS keywords
  - `paddingInline: '[18px]'` for off-grid metrics
  - `borderColor: '[rgba(232, 217, 184, 0.4)]'` for one-off rgba tints
  - `transition: '[background 0.15s ease]'` for shorthand transitions
- **Threshold for promoting an escape value to a token: 3 consumers.**
  Two callsites is acceptable duplication; a third means the value is
  a vocabulary, not a one-off.

### Operational notes

- **Tests.** `apps/web/vitest.config.ts` overrides PostCSS with an
  empty plugin list — jsdom doesn't render styles, and the Panda
  plugin's `findConfig` lookup would fail under the vitest cwd anyway.
- **a11y guard.** The e2e suite (ADR 0004) runs `@axe-core/playwright`
  against every route. During the migration this caught two
  cascade-related contrast regressions (h2 + button text on
  `bg.continue`) before they reached `develop`. Treat the axe job as
  the canonical contrast review.
- **Cache warning.** `next build` emits "Skipped not serializable
  cache item … PandaError" on first compile after a clean checkout.
  Cosmetic — the build succeeds and Next's webpack cache repopulates
  on the next run.

## References

- [ADR 0003: Design tokens — gold split by usage axis](./0003-design-tokens-gold-split.md)
- [ADR 0004: Visual regression with Playwright](./0004-visual-regression-playwright.md)
- PR #289 (bootstrap), #295 (colour tokens + strictTokens), #296
  (remaining tokens + breakpoints), #297 (button recipe), #298 (panel
  slot recipe), #299 (statusPill + globalCss), #300 (TopNav), #301
  (history), #302 / #304 / #305 (library), #306 / #307 (auth), #308
  (globals.css :root removal), #310 (SegmentHighlights)
