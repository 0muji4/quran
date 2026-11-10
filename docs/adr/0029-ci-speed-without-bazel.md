# ADR 0029: Faster CI from the Existing Tools, Without Bazel

- Status: Accepted
- Date: 2026-11-10
- Author: motoshi.suzuki
- Related: [ADR 0014](./0014-ci-path-scoped-workflows.md), [ADR 0027](./0027-native-snapshot-tests.md)

## Context

CI felt slow, and Bazel was proposed to build and test only what a change affects, as Google does.

ADR 0014 already runs a stack's jobs only when the diff touches that stack's paths. Within a stack, every job rebuilds everything. Over the 30 CI runs before this decision, a run took 0–12 minutes wall clock, and two jobs set its length:

| Job              | Time                                                   | Where the time went                                                                                                                                                                                                      |
| ---------------- | ------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `e2e`, ×3 shards | 3.7–5.1 min each                                       | `docker compose up` 144s: backend, bff and web images built with no cache, plus five observability services. Chromium installed on the runner, 44s, though the suite runs in the Playwright image. The tests: about 50s. |
| `mobile-ios`     | 5.1–8 min, plus up to 5 min waiting for a macOS runner | `xcodebuild build` 136s, then `xcodebuild test`, which builds again, 154s. About 57s of that was cloning 13 Swift packages.                                                                                              |

Most of the time went to setup and repeated builds, not to running tests.

The repository builds with six toolchains: Go, pnpm/TypeScript, Gradle/Android, Xcode/iOS, Playwright and Terraform.

## Decision

Keep the current tools, and remove the repeated work in each job:

- **e2e** ([#611](https://github.com/0muji4/quran/pull/611)):
  - Images are built with `docker/bake-action`, and their layers are read from the GitHub Actions cache.
  - Only runs outside pull requests write that cache, from one shard.
  - Only `web` and its dependencies start.
  - The runner no longer installs Chromium.
- **iOS** ([#612](https://github.com/0muji4/quran/pull/612)):
  - One `xcodebuild test` builds and tests.
  - Swift package checkouts are cached.
- **JS and e2e scoping** (this change):
  - `js-quality` no longer re-runs the web, bff and ui suites, because `test.yml` runs them with coverage.
  - e2e has its own path filter. It now also runs for backend and Go changes, and no longer runs for ESLint config changes.

Do not adopt Bazel.

## Rationale

- **The time went where Bazel does not reach.**
  - e2e waited on container images and service startup.
  - iOS built the same app twice on a macOS runner. With `rules_apple` the same compile would still run on the same runner.
  - Neither job changes which tests run, which is what Bazel's change-based testing decides.
- **Bazel's speed comes from a shared remote cache.**
  - Its local cache is lost with each ephemeral runner.
  - A remote cache is a service to run or pay for, and the project runs on a $0 stack (Render, Neon, R2).
- **The migration cost is high.**
  - Every toolchain needs its own rule set: `rules_go`, `rules_js`, `rules_kotlin` with the Android rules, and `rules_apple`.
  - Each one replaces a build that works today, and needs ongoing upkeep as the toolchains move.
- **The ideas carry over without Bazel.** Each tool already has the parts:
  - content-addressed caching: BuildKit layers, the Go build cache, the Gradle cache, SPM checkouts
  - pinned inputs: lockfiles, pinned images and runners (ADR 0027)
  - change-scoped runs: path filters (ADR 0014)

## Consequences

Measured after the changes:

| Job              | Before      | After       |
| ---------------- | ----------- | ----------- |
| `e2e`, per shard | 3.7–5.1 min | 1.9–2.5 min |
| `mobile-ios`     | 5.1–8 min   | 2.6 min     |

Positive:

- A full run is bounded by jobs of about 2.5 minutes instead of 5–8.
- Backend and Go changes are now exercised end-to-end. Before, e2e ran only for JS and DB changes.

Negative:

- The e2e image cache takes about 3 GB of the repository's 10 GB Actions cache, and the SPM cache about 0.6 GB.
- A pull request gets the e2e speed-up only from layers that develop has cached. A PR that changes the lockfile or Go code rebuilds those layers without a cache.
- Only a change whose path is in the stack's filter selects its jobs, so a new cross-cutting file needs a filter entry (ADR 0014). The nightly full run still catches omissions.

## Alternatives Considered

- **Bazel with a remote cache.** Not chosen, for the reasons above.
- **Nx or Turborepo for the JS packages.**
  - Not chosen: `js-quality` takes about 1.2 minutes, of which lint, test and build are about 45 seconds.
  - Caching those would save little and add a tool.
- **`pnpm --filter "...[origin/develop]"` to run only affected JS packages on PRs.** Not chosen, for the same reason:
  - It would trim seconds from a one-minute job.
  - It needs a full-history checkout.
  - It adds a way for a dependency edge to be missed.
- **Caching Xcode DerivedData.** Not chosen for now:
  - It is large, and much of it is invalidated by any source change.
  - The remaining iOS build takes about 2 minutes.

## Reconsideration Triggers

- After these changes, the p50 of a Linux job exceeds 5 minutes.
- Generated code between Go and TypeScript grows until path filters can no longer express what a change affects.
- More people contribute, and sharing a build cache between their machines and CI becomes worth running a remote cache.

## References

- [ADR 0014](./0014-ci-path-scoped-workflows.md): path-scoped workflows and the `ci-summary` required check
- [ADR 0027](./0027-native-snapshot-tests.md): the pinned iOS runner, Xcode and simulator
- `.github/workflows/ci.yml`, `.github/workflows/e2e.yml`, `.github/filters.yml`
- `ops/docker/compose.ci.yml`, `ops/docker/compose.ci-cache-write.yml`
