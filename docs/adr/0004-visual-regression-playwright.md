# ADR 0004: Visual regression with Playwright `toHaveScreenshot`

- Status: Accepted
- Date: 2026-05-09
- Author: motoshi.suzuki

## Context

The Tilawah Web redesign in PR #87 introduced a heavily decorative UI: corner ornaments, eight-point stars, the compass SVG on the Continue card, layered gradients, and three custom Google Fonts (Cormorant Garamond, Inter, Amiri). CSS or component changes can silently shift any of these without showing in a unified diff. Reviewers historically caught visual issues by manual exploration, which scales poorly and produces inconsistent coverage.

`docs/web-tilawah-followups.md` §3.4 listed visual regression as a Phase 3 prerequisite for the brand-token redesign in ADR 0003: any darkening of `--color-gold` or `--color-ink-muted` would land in production unreviewed without a layer that surfaces visual diffs. Two viable layers were considered:

1. **Playwright `toHaveScreenshot()`** — built into the existing `@playwright/test` stack, runs as part of the existing e2e shards.
2. **Chromatic** — SaaS, polished side-by-side diff UI for review.

A third option (Storybook + visual regression tooling) was off the table because no Storybook setup exists in the repo.

## Decision

**Adopt Playwright `toHaveScreenshot()` for visual regression. Commit the baseline `.png` files to git under `e2e/tests/visual/visual.spec.ts-snapshots/`. Generate baselines on Linux Chromium using the official `mcr.microsoft.com/playwright:v<X.Y.Z>-jammy` Docker image so they match CI's runner pixel-for-pixel.**

The visual specs live under `e2e/tests/visual/` and run on the existing `chromium-desktop` Playwright project (no new project needed; mobile / tablet / desktop-1024 projects skip via `testIgnore: /[\\/]mobile[\\/]/`).

Each scene seeds deterministic state via `context.addInitScript` (e.g., `tilawah:last-practiced` localStorage entries) rather than depending on the BFF, and calls a `stableSnapshot()` helper before `toHaveScreenshot()` to lock the four well-known sources of pixel drift:

- `page.emulateMedia({ reducedMotion: 'reduce' })` — disables `pulseDot`, `pulseRing`, `spin`, `completionToastIn` (which depend on the `prefers-reduced-motion` media query landed in PR #145).
- `await document.fonts.ready` — waits for `next/font/google` swap so the snapshot is not a fallback frame.
- A 120ms `waitForTimeout` — small layout-settle margin.
- Fixed viewport at 1280x720 via `test.use({ viewport: { width: 1280, height: 720 } })`.

Inherently non-deterministic regions are masked via the `mask:` option (e.g., the recording timer ticks once per second; the live waveform bars depend on fake-stream audio levels).

## Rationale

- **Zero new dependencies.** `@playwright/test ^1.57.0` already powers the e2e suite. No SaaS account, no monthly cost, no separate review surface.
- **Reuses existing infrastructure.** Phase 2.2-E established the chromium-desktop project pattern; PR #142 extended it for axe a11y; this layer slots in identically. CI integration is automatic — existing e2e shards pick up new specs without workflow edits.
- **Linux baselines remove the OS-drift question.** macOS Chromium and Linux Chromium do not render the same pixels even at the same viewport (font hinting, anti-aliasing, subpixel layout). Generating baselines through the official Playwright Docker image — the same Linux Chromium build that CI uses — pins the comparison. Developers regenerate via `docker run mcr.microsoft.com/playwright:vX.Y.Z-jammy` per `e2e/tests/visual/README.md`.
- **Test files stay in git, baselines stay in git.** Reviewers see both the spec change and the rendered image in the same PR. No external links, no time-bound artifacts.

## Consequences

Positive:

- The brand-token redesign in ADR 0003 is gated by a side-by-side image diff. A reviewer can scan the rendered screenshot in the PR and approve or reject visually, rather than approving on text-only token diffs.
- Future CSS refactors gain an automatic safety net without external buy-in.
- Static-state scenes (library with seeded Continue card, history with seeded attempts, practice idle) covered immediately as of PR #149.

Negative:

- Baseline `.png` files inflate the repo. Initial set is ~800KB across three scenes. At ~10 scenes the cumulative size is roughly 3–5MB. Manageable, but worth monitoring.
- macOS developers must use Docker to regenerate baselines. The README documents the procedure but it is a friction point compared to Chromatic's "click and approve in the web UI" flow.
- Two scenes are deferred:
  - **Recording state** — in the Playwright Docker image used to generate baselines locally, `MediaRecorder` reports as unsupported even with the chromium-desktop project's `--use-fake-device-for-media-stream` launch flag. The CI runner's Chromium (installed via `playwright install --with-deps chromium`) does not have this gap; existing `recording-flow.spec.ts` exercises the same code path. So this is a maintainer-tooling issue, not a CI-time issue. The scene is `test.fixme()`'d.
  - **Result page** — Server Components fetch the scoring job on render, so `page.route()` browser-side mocking cannot intercept it. A deterministic `scoring_jobs` row in `db/seed.sql` is the cleanest fix; deferred.

## Operational notes

- **Baseline regeneration is a deliberate act.** When a UI change is intentional, the developer regenerates the baselines via the README procedure and commits the new `.png` files in the same PR as the source change. The reviewer sees both diffs side by side.
- **`maxDiffPixels: 200` is the starting tolerance** per scene. Cross-OS sub-pixel rendering plus font hinting tend to add up to <100 pixels per frame; 200 absorbs noise without masking real regressions. Increase per-scene only when a diff is genuinely below visual perception.
- **`fullPage: true` for scrollable layouts** (library, history). The default viewport-only snapshot misses below-the-fold content where most rows live.

## Reconsideration Triggers

Re-open this ADR when **any** of the following hold:

1. The cumulative baseline size exceeds 50MB. Move to Git LFS or external snapshot storage.
2. macOS developer friction blocks contributions. Add a CI workflow that regenerates baselines on PR label and commits them back, or reassess the SaaS alternative.
3. Chromatic (or equivalent) becomes part of an existing licence the team holds, and its review UX justifies the migration cost.
4. A formal design system arrives that already publishes per-component visual snapshots; the project-side snapshots become redundant.

## Alternatives Considered

- **Chromatic**. Polished review UX, but introduces a SaaS dependency, a separate authentication boundary, and a monthly cost for pre-revenue infrastructure. Decided against for v1; reconsider per the trigger above.
- **Storybook + visual regression**. Would require introducing Storybook, writing stories for every component, and re-implementing seeding-with-localStorage outside the route context. Deferred indefinitely.
- **No visual regression**. Rejected: the brand-token redesign in ADR 0003 would be a leap of faith without a diff layer. The followups doc §3.4 explicitly cited regression detection as the prerequisite.
- **macOS-generated baselines with a high `maxDiffPixels` tolerance**. Rejected: the tolerance needed to absorb cross-OS rendering (~1500+ pixels per scene) would mask real regressions. Linux baselines are precise; macOS baselines would be loose by design.

## References

- `e2e/tests/visual/visual.spec.ts` — current spec (3 active + 1 fixme'd scene)
- `e2e/tests/visual/README.md` — baseline regeneration workflow
- `e2e/tests/visual/visual.spec.ts-snapshots/` — committed Linux baseline `.png` files
- `playwright.config.ts` — chromium-desktop project that the visual specs ride
- PR #148 — scaffold + spec
- PR #149 — three Linux-generated baselines + describe-fixme removal
- ADR 0002 — a11y allow-list lifecycle
- ADR 0003 — brand-token split that this layer gates
- `docs/web-tilawah-followups.md` §3.4 — original carve-out
