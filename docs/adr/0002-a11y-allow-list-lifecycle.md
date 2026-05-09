# ADR 0002: a11y baseline as a shrinking allow-list, not a permanent disable

- Status: Accepted
- Date: 2026-05-09
- Author: motoshi.suzuki

## Context

Phase 2.3 of `docs/web-tilawah-followups.md` introduced `@axe-core/playwright` to the e2e suite (`e2e/tests/a11y/axe.spec.ts`). At the moment it landed (PR #142) the Tilawah Web app had multiple pre-existing axe violations across `aria-allowed-role`, `list`, `region`, `landmark-one-main`, `color-contrast`, `aria-required-children`, and `page-has-heading-one`. Three viable strategies for handling them:

1. **Block all PRs** until a11y debt is cleaned up. Effectively a single mega-PR before any a11y enforcement is possible.
2. **Permanently disable failing rules.** axe runs but ignores those rules forever. Defeats the purpose — silent regressions remain silent.
3. **Allow-list of pre-existing violations**, with the explicit contract that the list shrinks PR-by-PR until empty. Each entry is documented with the sub-PR responsible for retiring it.

(1) is unrealistic for a single-engineer codebase mid-roadmap; (2) silently lets rule violations accumulate. Phase 2.3 (PRs #142–#147) used (3).

## Decision

**Use `KNOWN_VIOLATIONS` as a temporary, shrinking allow-list. Every entry must point to the sub-PR (or follow-up issue) that retires it, and the list must shrink over time, never grow.**

When a new fix lands, it removes its rule ID from `KNOWN_VIOLATIONS` in the same diff. When a fix needs design or product input that is out of scope for the current PR (e.g., brand-token darkening, heading hierarchy decision), the entry stays but the comment is updated to point at the follow-up that owns it.

A new violation outside the allow-list is treated as a real regression: fix-forward in a fresh PR. **Adding a new entry to `KNOWN_VIOLATIONS` instead of fixing the issue requires explicit justification in the PR description.**

## Rationale

- **Onboarding gradient.** Phase 2.3 took five sub-PRs to retire most rules (#142 scaffold, #143 aria-live, #144 ARIA semantics, #145 contrast on-dark, #146 keyboard / landmark, #147 trim + residual). A "fix everything first" gate would have produced one ~600-line mega-PR with no review purchase.
- **Visible roadmap.** `KNOWN_VIOLATIONS` with comments referencing sub-PRs is itself the to-do list. `git blame` on the file shows when each rule was retired.
- **Asymmetric blast radius.** Re-adding to the allow-list silently is the failure mode that this discipline must prevent — a single line edit can turn off enforcement for a whole rule. The "explicit justification" requirement in PR descriptions is the safeguard.

## Consequences

Positive:

- a11y enforcement was live from PR #142 onward without blocking the commit graph.
- Sub-PR ownership for each rule was visible in the `axe.spec.ts` comments throughout Phase 2.3.
- Phase 2.3 has a clean definition of done: `KNOWN_VIOLATIONS = []`. Currently the list is `['color-contrast', 'page-has-heading-one']`; both have explicit follow-ups (ADR 0003 and the practice-page heading PR respectively).

Negative:

- The discipline depends on humans not silently growing the list. There is no CI check that fails when an entry is added; reviewers must catch it.
- The initial Phase 2.3-A allow-list was assembled from the audit (predictions of what axe would flag) rather than from a real axe run. This caused #147 to fail CI when the trim removed `color-contrast` based on the comment "fixed by 2.3-D", but 2.3-D had only addressed on-dark contrast, not on-cream. The fix was to re-add the rule with an updated comment naming the three specific failing on-cream pairs.

## Lessons captured for future a11y / lint baselines

1. **Populate the allow-list from a real tool run, not from predictions.** Manual contrast math, tag-rule mapping, and "this should be fine" judgments are not measurement. For axe specifically: run the tool against every target route and seed the allow-list from `results.violations.map(v => v.id)`. This requires the dev stack to be up at scaffold time.
2. **PR description claims about "what's fixed" must be verified before being trusted in subsequent PRs.** When trimming an allow-list, re-run the tool on that PR to confirm the rules being removed actually pass — do not trust prior comments.
3. **Brand / visual decisions belong in their own PRs.** When a a11y rule's fix requires shifting brand colours, copy, or layout, separate the decision from the mechanics. ADR 0003 is the example: contrast failures were detected in Phase 2.3 but the brand-token redesign needs design buy-in and a visual diff (ADR 0004), so those were carved out as a follow-up rather than smuggled into 2.3-D.
4. **Allow-list shrinking is the work, not the side-effect.** If a sprint's allow-list trim is empty, the project did not actually become more accessible during that sprint.

## Reconsideration Triggers

Re-open this ADR when **any** of the following hold:

1. The allow-list grows over more than two consecutive PRs without shrinking. The discipline has broken; revisit whether the strategy or the team capacity is the issue.
2. A major redesign (UI or product) warrants resetting the baseline rather than chipping at it. In that case, plan a single re-baseline PR rather than chasing each rule.
3. The codebase grows to multiple maintainers and an unattended allow-list edit becomes a real risk. Add a CI lint that fails on diff additions to the array.

## Residual entries (as of 2026-05-09)

- `color-contrast` — three on-cream pairs (`.eyebrow` gold-on-cream 2.76:1, `--color-ink-muted` 4.37:1, `.btnGold` white-on-gold 3.14:1). Owned by ADR 0003 (token split + darken).
- `page-has-heading-one` — `/practice/[s]/[a]` has only RecorderPanel and TeacherPanel `h3`s. Owned by a follow-up that introduces a route-level `h1` reusing the `AutoFocusHeading` pattern from PR #126.

## References

- `e2e/tests/a11y/axe.spec.ts` — current allow-list and per-rule comments
- `docs/web-tilawah-followups.md` §2.3 — Phase 2.3 完了状況 sub-table
- PRs #142, #143, #144, #145, #146, #147 — Phase 2.3 sub-PRs
- ADR 0003 — brand-token split that retires `color-contrast`
- ADR 0004 — visual regression layer that gates the brand-token PR
