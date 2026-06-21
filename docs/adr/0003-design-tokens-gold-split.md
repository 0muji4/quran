# ADR 0003: Split `--color-gold` into surface / on-light / on-dark tokens

- Status: Accepted
- Date: 2026-05-09
- Author: motoshi.suzuki

## Context

Tilawah's brand identity centres on a warm metallic gold. The current design system encodes it as a single token `--color-gold: #b8893c` in `apps/web/app/globals.css`, used in two structurally different ways:

- As a **background**: `.btnGold` (CTA buttons), other gold accent surfaces.
- As **text on a light surface**: `.eyebrow` (uppercase labels in the cream surfaces), small accents.

Two more dark-context tokens already exist as siblings: `--color-gold-soft: #d9b26a` (text on dark backgrounds, e.g. continue card) and `--color-gold-ink: #6e4f1e` (a darker gold-brown, used in a few places).

Phase 2.3 surfaced WCAG AA contrast failures involving the single `--color-gold` token. axe measured:

| Pair | Where | Ratio | Required | Status |
| --- | --- | --- | --- | --- |
| `#b8893c` × cream `#f5f0e5` | `.eyebrow` | 2.76:1 | 4.5:1 | fails dramatically |
| white `#ffffff` × `#b8893c` | `.btnGold` | 3.14:1 | 4.5:1 (or 3:1 large) | fails normal text |
| `#7b6e5c` × cream `#f5f0e5` | `--color-ink-muted` | 4.37:1 | 4.5:1 | just under |

A single token cannot satisfy both usages: bright enough for the metallic-gold brand and white-on-gold fails AA; dark enough for AA text on cream and the gold loses its identity for backgrounds. The same misuse risk applies to any future component author who reaches for `--color-gold` without realising the call site dictates which contrast threshold matters.

Phase 2.3-D (PR #145) handled the on-dark contrast (`--color-ink-on-dark-mut: #b8a88c → #d4c4a4`) but explicitly deferred the on-cream / on-gold pairs because they require deliberate design judgment. ADR 0002 records the decision to keep `color-contrast` allow-listed until a focused brand-token PR lands.

## Decision

**Replace the single `--color-gold` token with a usage-axis split, and darken `--color-ink-muted` to clear AA on cream.**

```
--color-gold-surface: #b8893c    /* unchanged hex; meant for backgrounds */
--color-gold-on-light: #6e4f1e   /* renamed from --color-gold-ink; text on cream / paper */
--color-gold-on-dark:  #d9b26a   /* renamed from --color-gold-soft; text on dark surfaces */
--color-ink-muted:     #6b5d4a   /* darkened from #7b6e5c; ~5.0:1 on cream */
```

`--color-gold` (the bare name) is removed. New components are forced to choose: am I painting a surface, or am I painting text on cream, or am I painting text on dark?

Two complementary rules for `--color-gold-surface`:

- It MUST be paired with dark text (`--color-ink-strong` or similar) for normal-size copy.
- It MAY be paired with white text only when the surrounding text qualifies as WCAG large (≥ 18.66px bold or ≥ 24px regular). The current `.btnGold` (14px / 600 weight) does not qualify — the migration changes its text colour to dark, accepting the visual shift.

Per-call-site migration plan (rough order):

- `.eyebrow` (`apps/web/app/globals.css`) — `color: var(--color-gold)` → `var(--color-gold-on-light)`. This passes ~6:1 on cream.
- `.btnGold` (`apps/web/app/styles/library.module.css`, `practice.module.css`) — keep `background: var(--color-gold-surface)`; change `color: #fff` → `color: var(--color-ink-strong)`. White-on-gold becomes dark-on-gold.
- `.continueArabic`, `.continueOrnament`, `.btnGoldSoft` etc. — point at `--color-gold-on-dark` directly (rename of the existing `--color-gold-soft` consumers).
- Remaining `--color-gold` references (search and replace; expected ~10–15 sites) — categorise per usage and migrate.

`--color-ink-muted` darken applies wherever the token already lives; no per-call-site change needed.

## Rationale

- **Names express constraints.** `--color-gold-surface` cannot be reached for text without a code reviewer noticing the misuse. The token system documents itself rather than relying on style-guide vigilance.
- **Brand identity preserved.** `--color-gold-surface` keeps the `#b8893c` warmth on backgrounds. The visible change is `.btnGold` text colour (white → dark) and `.eyebrow` text colour (gold → dark gold-brown), both of which read as deliberate-looking treatments rather than brand drift.
- **No new system to learn.** This is a token rename plus one new value; no methodology, no third-party design system, no migration tooling.
- **Aligns with the project's engineering principles** — the named tokens express intent (Why) and constrain misuse (How), which is the recurring "design first, sizing second" discipline.

## Consequences

Positive:

- `KNOWN_VIOLATIONS` for `color-contrast` becomes empty (combined with this PR + the practice-page `h1` PR, allow-list reaches `[]`).
- Future component authors face a forced choice between the three gold variants — accidental brand misuse is structurally harder.
- The brand can later be retuned per usage axis (e.g., bump `--color-gold-on-light` slightly for a darker text feel) without touching backgrounds.

Negative:

- Naming churn: `--color-gold-ink` → `--color-gold-on-light` and `--color-gold-soft` → `--color-gold-on-dark` are renamed for symmetry with the new `surface` token. ~10 consumers will be updated.
- The visible `.btnGold` text-colour swap (white → dark) will look different from the original mockups even though it is more accessible. This is a deliberate trade-off; the original mockups were not contrast-checked.
- The migration touches every gold consumer in the app; the diff will be large in CSS but localised. Visual regression (ADR 0004) is the safety net.

## Reconsideration Triggers

- A formal design system arrives (Figma tokens, style-dictionary, Tailwind config) and supersedes the manual CSS variables. Re-derive the tokens from the design system source.
- A new gold-adjacent shade is introduced (e.g., `--color-amber`) and the surface/on-light/on-dark axis needs a fourth dimension. Extend rather than collapse.
- Brand redesign rejects the gold accent altogether. Delete this token family and re-baseline.

## Alternatives Considered

- **Darken `--color-gold` directly** (e.g., to `#9a6e2a`). Rejected: shifts brand visually for every consumer including non-text uses; loses the metallic-gold identity that the redesign chose deliberately. Single-token systems cannot satisfy multiple contrast requirements simultaneously.
- **Keep `--color-gold` and override the text-colour at each call site** (per-class fixes). Rejected: the next person to add a gold accent has to remember to pick a different text colour. Token name carries no warning.
- **Bump `.btnGold` font weight or size to qualify as WCAG large text** (3:1 threshold instead of 4.5:1). Rejected: 14px → 18.66px-bold pushes layout changes through every CTA in the app; not worth the disruption to keep white-on-gold.
- **Switch `.btnGold` to a dark-gold background like `#866024`**. Rejected: white-on-#866024 passes, but the brand reads as "dark amber" instead of "metallic gold". The surface token approach lets us keep the gold and pay the cost in a less visible place (button text colour).

## References

- `apps/web/app/globals.css` — current tokens and `:focus-visible` rule
- `apps/web/app/styles/{library,practice,nav}.module.css` — gold-using consumers
- `e2e/tests/a11y/axe.spec.ts` — `color-contrast` allow-list entry
- ADR 0002 — a11y allow-list lifecycle, which this PR shrinks
- ADR 0004 — visual regression layer that reviews this PR's UI impact
- PR #145 — Phase 2.3-D, which addressed only on-dark contrast and deferred the on-cream pairs
- `docs/web-tilawah-followups.md` §2.3 残課題 — the original carve-out
