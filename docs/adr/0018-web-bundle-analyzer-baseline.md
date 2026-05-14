# ADR 0018: Web bundle-analyzer baseline (Phase 4.3-A)

- Status: Accepted
- Date: 2026-05-13
- Author: motoshi.suzuki
- Tracks: Phase 4.3 in `docs/web-tilawah-followups.md` (sub-PR 4.3-A)

## Context

Phase 4.3 in the Tilawah follow-up roadmap calls for performance work in three flavours: split `PracticeClient` so server components don't pay hydration cost (4.3-B), wire client-side Web Vitals (4.3-C), and slim the Amiri font payload via unicode-range carving (4.3-D). None of that can be justified or measured without a build-time baseline of the current bundle and font footprint.

`apps/web` had no bundle measurement tooling. `pnpm --filter @quran-project/web build` printed Next.js' route-summary table but the per-chunk and per-asset breakdowns required to make optimisation decisions (e.g. _is Amiri actually the dominant font cost, or is it Inter latin-ext?_) were unavailable. Adding `@next/bundle-analyzer` makes the data accessible on demand.

## Decision

**Add `@next/bundle-analyzer` as a `devDependency` and gate it on the `ANALYZE=true` env var. Capture a one-shot baseline in `docs/web-tilawah-followups.md` §4.3, and re-measure on demand for follow-up perf PRs. Do not add the analyzer to CI.**

### Mechanism

`apps/web/next.config.mjs` wraps the existing config with `withBundleAnalyzer({ enabled: process.env.ANALYZE === 'true', openAnalyzer: false })`. With no env var, behaviour is byte-identical to before. With `ANALYZE=true`, the build additionally emits `apps/web/.next/analyze/{client,nodejs,edge}.html`.

`apps/web/package.json` gets an `analyze` script: `ANALYZE=true next build`. Engineers run `pnpm --filter @quran-project/web run analyze` and open the produced HTML reports locally.

### Why not in CI

- The analyzer doubles build time and produces ~1.6 MB of HTML — useful for humans, not for automation.
- Bundle size is already gated by the Next.js build summary printed in every CI build. Visible regressions show up in PR description / build logs; subtle ones are better caught by Lighthouse CI (4.3-C, separate ADR).
- The dev-only mode keeps the dep a build-time-only cost — no shipped JS, no peer-conflict surface.

## Baseline (2026-05-13)

Captured from `ANALYZE=true pnpm --filter @quran-project/web run analyze` on `feat/web-bundle-analyzer-scaffold` at commit `527af4b` of `develop`. Node 20, Next.js 15.0.3, macOS arm64.

### Per-route First Load JS (gzipped, from `next build` summary)

| Route                                             | Page JS  | First Load JS |
| ------------------------------------------------- | -------- | ------------- |
| `/`                                               | 6.2 kB   | **130 kB**    |
| `/practice/[surahId]/[ayahNumber]`                | 6.82 kB  | **136 kB** ←  |
| `/practice/[surahId]/[ayahNumber]/result/[jobId]` | 5.03 kB  | **134 kB** ←  |
| `/history`                                        | 3.03 kB  | 108 kB        |
| `/sign-in`, `/sign-up`                            | 2.87 kB  | 108 kB        |
| `/_not-found`                                     | 995 B    | 103 kB        |
| `/healthz`                                        | 133 B    | 102 kB        |
| Shared (every route)                              | —        | 102 kB        |

Shared 102 kB decomposes into two webpack chunks:

| Chunk                          | Size (gzipped) |
| ------------------------------ | -------------- |
| `chunks/29491661-….js`         | 54.2 kB        |
| `chunks/895-….js`              | 45.4 kB        |
| `chunks/other shared`          | 1.95 kB        |

`/practice/[surahId]/[ayahNumber]` is the heaviest route at 136 kB First Load JS, which 4.3-B will target by extracting `RecorderPanel` / `TeacherPanel` boundaries.

### Per-font woff2 footprint (raw bytes, served from `_next/static/media`)

| Font                       | Subset / weight        | File              | Size      |
| -------------------------- | ---------------------- | ----------------- | --------- |
| **Cormorant Garamond** (w500/600/700, shared files) | latin (preload `.p`)  | `7b89a4fd…`       | 37,776 B  |
|                            | latin-ext              | `48410f3d…`       | 33,740 B  |
|                            | vietnamese             | `c48b38fe…`       | 11,264 B  |
|                            | cyrillic               | `8715d2ed…`       | 21,132 B  |
|                            | cyrillic-ext           | `393d45a2…`       | 23,408 B  |
|                            | **subtotal**           |                   | **127.3 KiB** |
| **Inter** (variable 100–900) | latin (preload `.p`) | `e4af272c…`       | 48,432 B  |
|                            | latin-ext              | `8e9860b6…`       | 85,272 B  |
|                            | vietnamese             | `df0a9ae2…`       | 10,424 B  |
|                            | cyrillic               | `21350d82…`       | 18,744 B  |
|                            | cyrillic-ext           | `ba9851c3…`       | 25,844 B  |
|                            | greek                  | `19cfc722…`       | 10,280 B  |
|                            | mathematical           | `c5fe6dc8…`       | 11,272 B  |
|                            | **subtotal**           |                   | **205.3 KiB** |
| **Amiri** (w400)            | **arabic (preload `.p`)** | `5aae3a1c…`   | **108,492 B** ← |
|                            | latin-ext              | `ecb0c194…`       | 10,424 B  |
|                            | latin                  | `8c2fd50d…`       | 19,572 B  |
| **Amiri** (w700)            | **arabic (preload `.p`)** | `da6e5417…`   | **100,024 B** ← |
|                            | latin-ext              | `9c796412…`       | 10,836 B  |
|                            | latin                  | `dd5f2241…`       | 20,284 B  |
|                            | **subtotal**           |                   | **263.3 KiB** |

**Unicode-range gating means most of the above is conditional**: only the file whose `unicode-range` matches characters present on the page is actually fetched. The realistic on-paint cost of `/practice/[s]/[a]` (English UI + Arabic ayah body in Amiri 400) is:

- Cormorant latin `.p`: ~37 KiB
- Inter latin `.p`: ~47 KiB
- Amiri arabic-400 `.p`: ~106 KiB
- **Total per first paint ≈ 190 KiB of woff2**

Adding Amiri arabic-700 (used by emphasis / heading numerals) pushes that to ~288 KiB. **Amiri Arabic dominates the font budget at ~78% of the per-paint payload.** Slimming Amiri arabic with a Quran-only unicode-range (4.3-D) is therefore the single biggest font lever — a Quran subset is on the order of 700 glyphs vs Amiri's full ~3,500.

### Headline takeaways

1. **Amiri Arabic ~204 KiB** (both weights) is the dominant first-paint font cost; 4.3-D should target ~30–40 KiB after Quran-glyph subsetting.
2. **`/practice/[s]/[a]` First Load JS 136 kB** is the JS optimisation target. The two shared chunks (54.2 + 45.4 kB) likely contain React framework + OTel browser tracer; need 4.3-B to confirm via the analyzer HTML.
3. **Other routes already light** (`/history` 108 kB, `/sign-in` 108 kB); the win zone is `/practice` + `/practice/.../result` only.

## Consequences

### Positive

- Re-running `pnpm --filter @quran-project/web run analyze` produces an updated baseline on demand; subsequent 4.3-B/C/D PRs can quote deltas in their descriptions.
- Zero shipped-JS impact: analyzer is a build-time plugin, present only when env-gated.
- `package.json` script aliases the env-flag so engineers don't need to remember the magic string.

### Negative

- An extra dev dependency (≈ 1.3 MiB installed, including its bundled webpack plugin), one more package on `pnpm install`.
- HTML reports live in `.next/analyze/`, which is already `.gitignore`d via `.next`. Nothing to clean up, but reports are also not committed — future deltas live in this ADR / the followups doc, not in repo history.
- The baseline is **a snapshot at one commit** on one machine. Bundle hashes shift between builds; the kilobyte numbers are stable enough to compare deltas, but the named chunks (`29491661-…`) will change as code is added.

### Reconsideration triggers

- If a perf regression slips past the build-summary table and is only caught via analyzer inspection three times, promote analyzer output to a CI artefact (still env-gated; uploaded as workflow artefact for the perf-tagged PRs only).
- If `@next/bundle-analyzer` peer-conflicts with a Next.js minor version bump and the upstream fix lags, switch to `webpack-bundle-analyzer` directly via `next.config.mjs` `webpack(config) { … }`.

## References

- `apps/web/next.config.mjs` — `enableAnalyzer(nextConfig)` wrapping
- `apps/web/package.json` — `analyze` script + devDependency
- `docs/web-tilawah-followups.md` §4.3 — Phase 4.3 sub-PR breakdown
- ADR 0017 — same dev-only-tool gating pattern (`E2E_CROSS_BROWSER`)
