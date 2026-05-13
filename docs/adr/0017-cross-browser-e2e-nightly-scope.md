# ADR 0017: Cross-browser e2e — PR vs nightly scope

- Status: Accepted
- Date: 2026-05-13
- Author: motoshi.suzuki
- Tracks: Phase 4.2 in `docs/web-tilawah-followups.md`

## Context

E2E suite (`e2e/tests/**/*.spec.ts`) has been chromium-only since the redesign. `playwright.config.ts` defines four projects — `chromium-desktop`, `mobile-iphone`, `tablet-ipad`, `desktop-1024` — all running against `devices['Desktop Chrome']` with viewport overrides. `.github/workflows/e2e.yml` `playwright install --with-deps chromium`, never installs Firefox or WebKit.

That's been enough so far: every shipped feature has been chromium-verified, and visual regression (ADR 0004) is explicitly chromium-locked because Linux Chromium produces stable pixels and the other engines do not. But two practical risks accumulate over time:

- **iOS Safari / WebKit font rendering** — Amiri Arabic rendering, RTL line-breaking, and `font-display: swap` flickers all behave differently on WebKit, and the project's primary user device class is mobile Safari.
- **Firefox MediaRecorder / mic permission** — Firefox handles `navigator.mediaDevices.getUserMedia` slightly differently and has its own MediaRecorder codec quirks (no `audio/webm` MIME without an extra config).

Doing the obvious thing — adding `firefox-desktop` and `webkit-desktop` projects and running them every PR — triples PR-time e2e cost (3 browsers × 3 shards = 9 jobs) for a signal we don't act on every PR.

## Decision

**Run chromium on PRs; run firefox + webkit on nightlies, with the cross-browser projects opt-in via `E2E_CROSS_BROWSER=true`. Carve the cross-browser suite down to the static-UI subset so the engines that don't have stable mic / pixel paths don't introduce false-positives.**

### Playwright projects

`e2e/playwright.config.ts` always defines the four chromium projects. The cross-browser pair is appended only when the env flag is set:

```ts
...(process.env.E2E_CROSS_BROWSER === 'true'
  ? [
      { name: 'firefox-desktop', testIgnore: /[\\/](mobile|visual|a11y)[\\/]|recording-flow\.spec\.ts$/, use: { ...devices['Desktop Firefox'] } },
      { name: 'webkit-desktop',  testIgnore: /[\\/](mobile|visual|a11y)[\\/]|recording-flow\.spec\.ts$/, use: { ...devices['Desktop Safari']  } },
    ]
  : []),
```

The `testIgnore` carve-out is intentional:

- `mobile/` — viewport-only specs that already exist for chromium variants; cross-browser mobile matrix would explode the cell count without new signal.
- `visual/` — ADR 0004 commits to Linux Chromium baselines; mixing engines in the same baseline pool guarantees noise.
- `a11y/` — axe-core baseline locked to chromium (PR #142). Re-running on other engines does not surface new violation rules at the cost of additional runtime.
- `recording-flow.spec.ts` — uses `context.grantPermissions(['microphone'])` + chromium-specific fake-stream flags. Firefox / WebKit need a different permission shape (or none at all); we'd need a per-engine setup helper to make it portable. Out of scope for A4; the spec is `chromium-only` for now.

What stays in cross-browser scope: `library.spec.ts`, `history.spec.ts`, `navigation.spec.ts`, `error-handling.spec.ts`, `suggestion.spec.ts` (post-3.3-B). These are static / link-driven tests where an engine difference signals an actual regression.

### CI placement

- **PR-time** (`.github/workflows/e2e.yml`): unchanged — `playwright install --with-deps chromium`, no `E2E_CROSS_BROWSER` env, no firefox / webkit projects materialise.
- **Nightly** (`.github/workflows/nightly-ci.yml`): new `cross-browser-e2e` job matrix over `[firefox, webkit]`. Each cell installs its own browser, brings the compose stack up, runs `playwright test --project=${browser}-desktop` with `E2E_CROSS_BROWSER=true`, uploads its own report artefact.

### Failure policy

Nightly failures do not block merges (they ran after the fact). They surface as the standard GitHub Actions notifications and the report artefact for triage. If a cross-browser spec failure persists for ≥ 2 nightly runs, file a follow-up issue.

## Rationale

- **Cost vs. signal.** PR cycles run dozens of times a day; tripling them for a signal that turns into action maybe once a sprint is poor ROI. Nightly catches the regressions on the day they land without slowing iteration.
- **`E2E_CROSS_BROWSER` env over project deletion.** Keeping the project definitions inline (gated by env) means `npx playwright test --project=firefox-desktop` works locally for dev investigation without editing the config first.
- **`testIgnore` carve-out over per-spec `test.skip`.** Filename-based ignore is one mechanism in one place; per-spec skip would scatter the logic across the suite and miss new specs added later.
- **Don't re-run viewport/visual/a11y per engine.** The "engine bug" payload for those categories is empty; visual is locked to Linux Chromium by definition, a11y axe-core findings are engine-agnostic.

## Consequences

### Positive

- PR feedback stays at the same speed.
- Static-UI cross-browser regressions surface within 24h via nightly.
- Local cross-browser debugging is a one-flag toggle: `E2E_CROSS_BROWSER=true pnpm test:e2e --project=webkit-desktop`.

### Negative

- A cross-browser regression that lands on a PR is observable next-nightly, not at PR review. Accepted trade-off — the cost of catching it at PR review is paid by every other PR that does not have a cross-browser bug.
- Recording flow stays chromium-tested. If Safari / Firefox quietly break MediaRecorder upload, we don't see it. Mitigation tracked at deployment time (real-device QA before launch).
- A new spec author has to remember "is this spec engine-agnostic enough to cross-browser?". The `testIgnore` regex is one place to update, but it requires the author to think about it.

### Reconsideration triggers

- A cross-browser regression slips past nightly into production → tighten by promoting nightly cross-browser to PR-time for the affected spec category.
- Firefox / WebKit usage in real user telemetry (Phase 4.4) exceeds ~30% → invest in making `recording-flow.spec.ts` cross-browser-compatible.
- iOS Safari ships a font / RTL bug that breaks rendering and we'd like the test suite to have caught it earlier → tighten scope.

## References

- `e2e/playwright.config.ts` — `projects` array, env-gated extension
- `.github/workflows/nightly-ci.yml` — `cross-browser-e2e` matrix job
- `.github/workflows/e2e.yml` — PR-time chromium-only path (unchanged)
- ADR 0004 — visual regression chromium lock
- ADR 0014 — nightly safety-net pattern this builds on
- `docs/web-tilawah-followups.md` §4.2 — original carve-out
