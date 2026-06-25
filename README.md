# quran-project

A cross-platform pronunciation practice app for Quran recitation. Provides guided practice with model audio, user recording, automated scoring, and review workflows so learners can improve their tajwīd fundamentals.

## Tech Stack

| Layer            | Technology                                         |
| ---------------- | -------------------------------------------------- |
| Web              | React + TypeScript (Next.js / App Router)          |
| BFF              | TypeScript (Express + GraphQL + RSC-friendly REST) |
| Backend          | Go                                                 |
| Mobile           | Android (Kotlin / Compose), iOS (Swift / Apollo)   |
| Database         | PostgreSQL                                         |
| Object Storage   | S3-compatible (MinIO)                              |
| Containers / Dev | Docker Compose                                     |
| Observability    | OpenTelemetry, Jaeger, Prometheus, Loki, Grafana   |

## Per-domain READMEs

Local setup, build, and test instructions live next to the code they describe:

| Domain                                                            | Location                                                       |
| ----------------------------------------------------------------- | -------------------------------------------------------------- |
| Local dev stack (Docker Compose / Make / DB)                      | [`ops/README.md`](./ops/README.md)                             |
| Observability stack (OTEL / Jaeger / Prometheus / Loki / Grafana) | [`ops/observability/README.md`](./ops/observability/README.md) |
| Backend (Go)                                                      | [`apps/backend/README.md`](./apps/backend/README.md)           |
| BFF (TypeScript)                                                  | [`apps/bff/README.md`](./apps/bff/README.md)                   |
| Web (Next.js)                                                     | [`apps/web/README.md`](./apps/web/README.md)                   |
| Android                                                           | [`apps/android/README.md`](./apps/android/README.md)           |
| iOS                                                               | [`apps/ios/README.md`](./apps/ios/README.md)                   |

## Prerequisites

Use **Node 20** locally (matches CI). `.node-version` is gitignored on purpose, so
each developer pins the version in their own checkout rather than committing it.
With nodenv:

```bash
nodenv local 20.20.0   # writes a local, gitignored .node-version
```

Other version managers (`fnm`, `nvm`, `asdf`) read `.node-version` too. Without a
Node 20 selected, `pnpm` resolves against the wrong runtime and fails with
`pnpm: command not found`.

## Quick Start

To bring up the entire stack:

```bash
pnpm install
make dev-up
make db-migrate && make db-seed   # first time only
```

Default published ports: Web 3000 / BFF 4000 / Backend 8080 / Postgres 5432 / MinIO 9000-9001 / Jaeger 16686 / Prometheus 9090 / Grafana 3200. See [`ops/README.md`](./ops/README.md) for details.

## Running All Tests

```bash
make ci                  # format / lint / test / build / Go fmt / Go test
make test-coverage-all   # Go + TS coverage (80% threshold)
```

Coverage thresholds are **80% for lines / functions / branches / statements**. CI checks coverage on every PR and retains reports for 30 days. Per-package coverage details live in each domain README.

## Repository Layout

- `apps/` — `web` / `bff` / `backend` / `android` / `ios`
- `packages/` — `ui` / `shared-ts` / `go-pkg` / `eslint-config` / `ts-config`
- `db/` — migrations (`migrations/`), reference Quran seed (`seed_quran.sql`, auto-generated), and demo fixtures (`seed.sql`)
- `ops/` — Docker Compose, observability, local dev tooling
- `schemas/graphql/` — GraphQL schema
- `e2e/` — Playwright end-to-end tests

## Notes

- BFF acts as a proxy in front of backend (`:8080`). When `/rsc/*` misbehaves, work backwards: BFF → backend → DB.
- Web is App Router only; `pages/` is not used.
- Run `make help` to list every Make target.

## Attribution

The Arabic Quran text shipped in `db/seed_quran.sql` is sourced verbatim from
the [Tanzil Uthmani text](https://tanzil.net/) via
[risan/quran-json](https://github.com/risan/quran-json). The Tanzil text is
licensed under [CC BY-ND 3.0](https://creativecommons.org/licenses/by-nd/3.0/);
it is reproduced without modification. Regenerate the seed via
`pnpm gen:quran-seed` when the upstream dataset is bumped.

The Arabic typeface used on the web client is **Amiri**, distributed under the
[SIL Open Font License v1.1](https://openfontlicense.org/). The two woff2 files
under `apps/web/app/fonts/` are pre-subsetted derivatives of the upstream
[`aliftype/amiri`](https://github.com/aliftype/amiri) `1.001` release covering
only the Quran corpus plus a small UI allow-list; per OFL §"Reserved Font Name"
they identify internally as `Tilawah Amiri Quran Subset` rather than `Amiri`.
A verbatim copy of the licence lives at `apps/web/app/fonts/OFL.txt`.
Regenerate the subset via `scripts/build-amiri-quran-subset.sh` when upstream
ships a new release or the Quran corpus changes — see ADR 0020 and
`apps/web/app/fonts/README.md` for the recipe.
