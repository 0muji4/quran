# ADR 0020: Amiri pre-subsetted to the Quran corpus, served via `next/font/local` (Phase 4.3-D)

- Status: Accepted
- Date: 2026-05-14
- Author: motoshi.suzuki
- Tracks: Phase 4.3-D in `docs/web-tilawah-followups.md`

## Context

ADR 0018 captured the bundle baseline and named Amiri Arabic as the dominant first-paint cost: ~204 KiB across both weights — about 78 % of the per-paint font payload on `/practice/[s]/[a]`. The followups doc estimated Quran-only subsetting could land that closer to 30–40 KiB per weight.

Until this PR, Amiri shipped via Next.js' `next/font/google` integration, which pulls the Google-Fonts-served woff2 files. Those files are already unicode-range-gated (so only the `arabic` block subset loads at paint), but the gating is by Unicode block, not by actual usage — Google's "arabic" subset is the full ~3,500-glyph repertoire of Amiri, of which only ~90 codepoints are ever rendered by Tilawah.

A few options were considered:

1. **CSS `@font-face` with a tighter `unicode-range`.** Google already does this; we'd be re-narrowing the same files. No payload reduction.
2. **Switch to upstream `AmiriQuran.ttf`.** That's a Quran-focused fork (133 KB TTF / ~60 KB woff2). Smaller than the full Amiri but still wider than what Tilawah needs.
3. **Pre-subset `Amiri-Regular.ttf` + `Amiri-Bold.ttf` to the Tilawah glyph set + UI allow-list.** Produces the smallest payload but requires a build-time-only tool and OFL Reserved-Font-Name handling.

## Decision

**Adopt option 3. Pre-subset `Amiri-Regular.ttf` + `Amiri-Bold.ttf` to the codepoint set actually used by Tilawah (Quran corpus + UI allow-list), check the resulting woff2 files into the repo, and load them via `next/font/local`. Rename the font internally to satisfy OFL §"Reserved Font Name".**

### Mechanism

#### Subsetting toolchain

`scripts/build-amiri-quran-subset.sh` orchestrates the whole pipeline:

1. Downloads the upstream Amiri release zip (pinned to `1.001`).
2. Runs `scripts/_extract-quran-codepoints.py` against `db/seed_quran.sql` to derive the union of every Arabic codepoint that appears in the Tanzil Uthmani text (the canonical Quran corpus the BFF serves) plus a small UI allow-list (Arabic-Indic digits, common honorifics like `ﷺ`, whitespace / punctuation that bleeds through Arabic strings).
3. Pipes the codepoint list to `pyftsubset` (`python3 -m fontTools.subset`) with `--flavor=woff2`, `--layout-features='*'` to preserve all Arabic shaping rules, and `--desubroutinize` to flatten CFF.
4. Calls `scripts/_rename-font-family.py` to overwrite NameID 1 / 4 / 16 records to `"Tilawah Amiri Quran Subset"`, complying with OFL §5.
5. Writes `apps/web/app/fonts/amiri-quran-subset-regular.woff2` and `…-bold.woff2`.

The script is dev-time only: regenerated woff2 binaries are committed to the repo. Production builds need nothing beyond what `pnpm install` provides.

#### Why commit the binaries

- Production CI does not need fontTools / brotli / zopfli installed.
- The Quran corpus is essentially fixed (Tanzil Uthmani text, pinned via `pnpm gen:quran-seed`); the script is rarely re-run.
- `next/font/local` references the binaries by relative path; checking them in keeps the layout module a pure declarative import.
- File diffs in PRs make font-payload regressions visible to reviewers (a sudden +50 KiB jump signals an over-broad subset).

#### Codepoint derivation

`_extract-quran-codepoints.py` scans `db/seed_quran.sql` line by line and pulls every codepoint in the Arabic / Arabic Supplement / Arabic Extended-A / Arabic Presentation Forms A&B blocks (regex `[؀-ۿݐ-ݿࢠ-ࣿﭐ-﷿ﹰ-﻿]`). The seed file contains every ayah of the Quran verbatim, so the resulting set is exactly the glyph repertoire the BFF can ever serve.

Plus a fixed `UI_ALLOWLIST`:

- Arabic-Indic digits `٠–٩` for ayah numbering rendered as Arabic-Indic
- `ﷺ` SALLA SAW (U+FDFA) — honorific commonly inlined by Quran UIs
- `ﷲ` ALLAH ligature (U+FDF2), `﷽` BISMILLAH (U+FDFD)
- `۝` END OF AYAH (U+06DD), `۞` START OF RUB EL HIZB (U+06DE)
- ASCII space (`U+0020`), no-break space (`U+00A0`), Arabic comma / semicolon / question mark

Net codepoint count: **91 unique codepoints** for the build that shipped this ADR. Adding a glyph requires editing the allow-list and re-running the script.

#### Why subset Regular + Bold (not also Italic / BoldItalic)

The two Amiri italic variants are not loaded by Tilawah; `layout.tsx` only requests weights `400` and `700`. Including them in the subset would double the script runtime and the committed binary count for nothing.

### OFL Reserved Font Name compliance

Amiri is distributed under the SIL Open Font License v1.1, which declares `"Amiri"` as the Reserved Font Name. Section 5 requires modified copies to not use the reserved name in their internal `name` records. The pipeline therefore overwrites NameID 1 (Family Name), NameID 4 (Full Font Name), and NameID 16 (Preferred Family Name) with `"Tilawah Amiri Quran Subset"`.

CSS resolution is unaffected. `next/font/local` synthesises its own family name when emitting the `@font-face` rule (something like `__amiri_a1b2c3`), so the CSS variable `--font-amiri` still works exactly as before; reviewers do not need to touch any of the `.module.css` files. The renamed `name` table only matters if someone inspects the file standalone — and at that point the file correctly identifies as a derivative.

`OFL.txt` from the upstream release is committed alongside the woff2 files (`apps/web/app/fonts/OFL.txt`), satisfying OFL §"Distribution".

## Bundle impact

Measured against the post-4.3-C baseline (PR #248) on the same build pipeline:

### Font payload at first paint of `/practice/[s]/[a]`

| File                                    | Before (Google) | After (subset) | Delta |
|-----------------------------------------|----------------:|---------------:|------:|
| Amiri weight 400 arabic `.p` (preload)  | 108,492 B       | **46,820 B**   | **−61.7 KiB** |
| Amiri weight 700 arabic `.p` (preload)  | 100,024 B       | **47,064 B**   | **−51.7 KiB** |
| Amiri latin / latin-ext (range-gated)   | 30,008 + 31,120 B | 0 (not included in subset) | −59.7 KiB |
| **Sum of all Amiri assets shipped**     | **~269 KiB**    | **~93.9 KiB**  | **~−175 KiB (~−65 %)** |

The realistic per-paint number — Arabic-400 + Arabic-700, both preloaded — moves from ~204 KiB to ~93.9 KiB. That's a **~54 % reduction in Amiri first-paint cost** and a **~38 % reduction in total first-paint font payload** across all three families.

### JS bundle (no change expected)

| Route | First Load JS (before) | First Load JS (after) |
|-------|-----------------------:|----------------------:|
| `/`                                | 131 kB | **131 kB** |
| `/practice/[s]/[a]`                | 136 kB | **136 kB** |
| `/practice/[s]/[a]/result/[jobId]` | 134 kB | **134 kB** |

Font binaries don't appear in the First Load JS metric; the savings show up as fewer / smaller `_next/static/media/*.woff2` requests at runtime.

### Visual regression

All five `e2e/tests/visual/` baselines (library / library-with-continue / history / practice-idle / practice-result) pass against the rebuilt web container on Linux Chromium. Glyph outlines are identical to the Google-served files (same upstream `Amiri-Regular.ttf` / `Amiri-Bold.ttf` source) and the `font-display: swap` behaviour matches `next/font/google`, so no pixel-level drift surfaces.

## Consequences

### Positive

- ~110 KiB shaved off the preloaded font payload of every route that renders Arabic — visible in `web.vitals.lcp` once 4.3-C is wired to a real collector endpoint (the produced subset will be the natural before/after baseline pair).
- Tilawah no longer leaks the user agent → fonts.googleapis.com on first paint. Privacy-incidental win.
- Subsetting script is committed and reproducible; the binary diff in a PR is the audit trail.

### Negative

- Adding a new Arabic glyph (e.g. a new honorific in UI copy) requires editing the codepoint allow-list and re-running the script. The README spells out the recipe.
- `pyftsubset` / brotli / zopfli are dev-time prerequisites for regeneration (Python 3 + `fonttools[woff]`). Not needed for production builds — but anyone refreshing the subset must install them once.
- The committed woff2 files add ~94 KiB to the git repo size. Trivial in absolute terms; the alternative (re-fetching from Google at runtime) has its own ongoing cost.

### Reconsideration triggers

- Upstream Amiri publishes a new release with broader Quranic ligature coverage → bump `AMIRI_VERSION` in the script, re-run, commit refreshed binaries.
- The Quran corpus changes (e.g. switch from Tanzil Uthmani to another canonical text) → regenerate after `pnpm gen:quran-seed`.
- A future feature requires Amiri Italic → extend the script to include `Amiri-Italic.ttf` and update `layout.tsx` to declare the new font face.
- Real-user RUM from 4.3-C shows Amiri is no longer the dominant first-paint cost → re-prioritise the next perf lever.

## References

- `apps/web/app/layout.tsx` — `next/font/local` declaration
- `apps/web/app/fonts/` — committed woff2 + OFL + README
- `scripts/build-amiri-quran-subset.sh` — orchestrator
- `scripts/_extract-quran-codepoints.py` — codepoint derivation
- `scripts/_rename-font-family.py` — OFL rename pass
- ADR 0018 — bundle baseline; the Amiri rows in `Per-font woff2` were the target
- ADR 0019 — Web Vitals RUM; future before/after lever for this change
- `docs/web-tilawah-followups.md` §4.3 — Phase 4.3 sub-PR breakdown
- SIL OFL v1.1 — `apps/web/app/fonts/OFL.txt`
