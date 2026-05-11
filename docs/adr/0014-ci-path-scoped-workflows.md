# ADR 0014: CI Workflows Scoped to Changed Paths with a Stable Required Check

- Status: Accepted
- Date: 2026-05-12
- Author: motoshi.suzuki
- Tracks: [Issue #225](https://github.com/0muji4/quran-project/issues/225)

## Context

The repository now hosts four independent runtime stacks (Web/Next.js, BFF/Node, Backend/Go, Worker/Python) and two mobile clients (iOS, Android) inside a single git repo. Every PR currently triggers every workflow under `.github/workflows/` — `ci.yml`, `test.yml`, `e2e.yml`, `mobile-ci.yml` — regardless of which stack the diff actually touches. An iOS-only PR runs the Web/BFF tests; a docs-only PR boots Playwright; a Go-only PR pays the iOS and Android build cost.

As the deployment work (ADR 0010) and the per-app phases progress, CI volume per PR will grow, not shrink. The same physical PR queue will increasingly carry stack-scoped changes whose feedback loop is dominated by unrelated tooling. The two costs are:

1. **Compute & feedback latency.** PR feedback time directly affects iteration velocity and is the most-cited frustration in monorepo developer-experience surveys.
2. **Noise blindness.** When every PR runs every check, the team stops reading the green/red distinctions per-stack and starts treating CI as a single binary signal. A real failure in a stack the PR did not touch gets attributed to "flaky CI" rather than investigated.

A naive fix — adding `on.paths` filters to each workflow — interacts badly with GitHub's branch protection. A required check that gets *skipped* is recorded as `neutral`, and most branch-protection configurations block merge on a neutral check. The team would either disable required checks (losing the protection) or override per-PR (losing the team-wide guarantee).

## Decision

Adopt a two-tier CI scoping pattern, executed in a specific order:

1. **Tier "required-check stability" (must land first).** Add a single umbrella job — `ci-summary` — that `needs:` every leaf job, runs `if: always()`, and fails when any upstream is `failure` or `cancelled`. Branch protection on `develop` and `main` requires only `ci-summary`. Individual jobs become free to skip without breaking merge.
2. **Tier "path-based gating" (lands second, builds on tier 1).** Add `.github/filters.yml` keyed by stack (`js`, `go`, `ios`, `android`, `python`, `db`) plus a `shared` anchor expanded into each non-mobile stack. Each workflow's first job is `dorny/paths-filter@v3`; downstream jobs gate on its outputs.
3. **Tier "safety net" (third, defensive).** A nightly cron workflow runs the full suite without filters against `develop` and `main`, so any silent under-execution caused by a `filters.yml` authoring mistake surfaces within 24 hours rather than weeks.

Higher-precision tools (Turborepo, Nx, Bazel) are explicitly **deferred** until JS workspace growth or polyglot affected-graph needs justify them. At the current scale (`apps/{web,bff}` + 4 packages, plus separate iOS/Android/Go/Python stacks) hand-maintained filters are cheaper than the build-tool adoption cost.

## Rationale

### Why a stable umbrella check is non-negotiable

Across well-known monorepo teams (Vercel, Linear, Cloudflare's public projects), the single dominant cause of "CI scoping broke our merge queue" incidents is mismatched required-check names. The umbrella-job pattern is the cheapest known fix: branch protection talks to one stable name, the umbrella talks to the real jobs via `needs.*.result`, and the relationship between "what was required" and "what ran" is collapsed into one place.

Doing this first matters because every other change in this ADR can land safely behind it. Doing it second means the day path filters land, every PR with a partial-stack change becomes unmergeable.

### Why `dorny/paths-filter` over `on.paths`

GitHub's native `on.paths` is simpler to write but produces silently-skipped workflows whose required-check effects depend on branch-protection edge cases. `paths-filter`-gated *jobs* always run (the `changes` job itself executes), so the umbrella job always observes definite `success` / `failure` / `skipped` results. The cost is one extra dependency.

### Why hand-maintained filters over Turborepo *for now*

Turborepo's affected-graph is structurally superior — it cannot have the "forgot to add `packages/shared-ts` to the `js` filter" failure mode this ADR's nightly safety net is designed to catch. But Turborepo requires:

- A `turbo.json` that models every task and its inputs.
- All scripts being callable from the workspace root through `turbo run`.
- A cache provider (local or remote) for any speed benefit.
- A discovery + learning curve for every contributor.

At the current scale (4 packages, 4 apps), the maintenance burden of `.github/filters.yml` is small and visible. The break-even with Turborepo arrives somewhere around 8–12 packages and 3+ shared packages with non-trivial dependency relations. The reconsideration trigger is codified in §Reconsideration below.

### Why a nightly full-CI is mandatory rather than optional

The single most common path-filter failure mode is *silent under-execution*: a contributor adds a new shared file to `packages/`, forgets to add it to the `shared` anchor in `filters.yml`, and for some weeks no JS-side test runs on PRs that touch it. The bug only surfaces when something else triggers a full run.

Running the full unfiltered suite nightly against `develop` and `main` bounds this hazard to "at most one calendar day of undetected drift" and makes detection automatic. Without this, the path-filter pattern goes from "best practice" to "tech debt accumulator."

### Why not adopt Bazel / Pants

Polyglot affected-graph tools (Bazel, Pants, Buck) solve exactly the problem this ADR addresses, but for codebases an order of magnitude larger. Shopify ships Bazel on a Rails monorepo of thousands of services; Stripe uses Pants. The setup cost is on the order of an engineer-quarter and is justified only when the team passes ~50 services or ~10 active contributors. This project is far from that threshold and is unlikely to cross it within the deployment-plan horizon.

## Consequences

Positive:

- iOS-only PRs no longer pay JS/Go/Python CI cost. Same for the reverse.
- Required check stays a single, stable name across all PR shapes; branch protection configuration does not need to track which workflows exist this week.
- Cross-cutting changes (shared packages, lockfile, workflows, root config) still trigger everything by construction, because they live in the `shared` anchor that every non-mobile stack consumes.
- Nightly full-CI catches filter authoring mistakes within 24 hours.
- The pattern is portable: when Turborepo is eventually adopted, `paths-filter`'s outputs are replaceable by `turbo run --filter=...[origin/develop]` without rewriting the umbrella-job or the safety-net cron.

Negative:

- `.github/filters.yml` is a hand-maintained piece of project knowledge. New cross-cutting files need to be added to `shared` deliberately, and the nightly is what catches the omission rather than a compile-time guarantee.
- An action dependency (`dorny/paths-filter@v3`) is introduced. Pinning by major version with periodic dependabot bumps mitigates the supply-chain surface; pinning by SHA is the stricter alternative if the security ADR ever calls for it.
- Mobile PR reviewers temporarily lose the per-PR signal that "the Web build still builds" — that signal moves to nightly. The trade-off is acceptable because the Web build never depended on iOS or Android changes.

## Reconsideration Triggers

Replace the hand-maintained filters with Turborepo (or equivalent) when **any one** of the following holds:

1. The JS workspace has **eight or more packages** under `packages/` or `apps/`, OR
2. **Three or more packages** are direct dependencies of at least two apps each (the "shared package" count), OR
3. A `filters.yml` authoring miss is detected on nightly **three times in a quarter**, indicating the manual list has exceeded human reliability, OR
4. CI runtime on a clean cold cache exceeds **15 minutes** for a single-stack PR despite path filtering.

Trigger 3 is the strongest single signal: it is the symptom of the failure mode hand-maintained filters cannot prevent.

## Out of Scope

- Compute optimisation (larger runners, parallel sharding, test-suite partitioning). May be revisited as a separate ADR; orthogonal to scoping.
- Migration to a different CI provider. Remains on GitHub Actions.
- Per-job behaviour changes. This ADR governs *when* each existing job runs, not *what* it does.
- Pre-merge merge queues (`merge_group` events). May be layered on later; the umbrella-job pattern is compatible.
- Dependabot / Renovate workflow paths. They produce `pnpm-lock.yaml` and `go.sum` diffs that the `shared` anchor already captures.

## Alternatives Considered

- **Bare `on.paths` filters.** Rejected: skipped required checks block merge.
- **`paths-ignore` rather than `paths`.** Rejected: the failure mode (forgetting to ignore something) is silent over-execution, which is the wrong direction of failure.
- **Per-PR labelled triggers** (`run-ios`, `run-web`). Rejected: imposes manual cognitive overhead on every author and is the failure mode `paths-filter` exists to eliminate.
- **Custom shell script reading `git diff` directly.** Rejected: reinvents `paths-filter` worse, and the maintenance cost compounds.
- **Turborepo now.** Rejected on scale grounds; see Rationale and Reconsideration.

## References

- [Issue #225](https://github.com/0muji4/quran-project/issues/225) — implementation tracker, acceptance criteria, phased rollout
- `.github/workflows/{ci,test,e2e,mobile-ci}.yml` — workflows whose triggers this ADR scopes
- `pnpm-workspace.yaml`, `go.work` — workspace definitions that motivate the `shared` anchor contents
- [ADR 0010](./0010-gcp-cloud-run-deployment.md), [ADR 0012](./0012-database-migrations-with-golang-migrate.md) — deployment-stack ADRs that this work does not block and is not blocked by
- `dorny/paths-filter` GitHub Action, used by Vercel / Linear / Cloudflare projects as a public-record reference pattern
