# ADR 0012: Database Migrations with golang-migrate

- Status: Accepted
- Date: 2026-05-11
- Author: motoshi.suzuki
- Related: [ADR 0010](./0010-gcp-cloud-run-deployment.md), [ADR 0011](./0011-cloud-portability-principle.md)

## Context

Before this ADR, `make db-migrate` ran `psql < file.sql` for every `*.sql` file under `db/migrations/`, in shell-glob order, against the local Docker Compose Postgres. There was no version tracking table, no advisory lock, no recovery from partial failure, no `down` path, and no way to know from the database itself which migrations had been applied. The CI workflow installed a different unrelated tool (`sql-migrate`) and ran a no-op dry-run against a `dbconfig.yml` file that does not exist in the repo.

[ADR 0010](./0010-gcp-cloud-run-deployment.md) requires that every Cloud Run deploy run a database migration step before any service revision is exposed to traffic. That requirement is incompatible with the current ad-hoc psql script: re-running it would fail on the second deploy (every `CREATE TABLE` would re-execute), and a partial failure leaves the schema in an unknown state.

The decision needed is: which migration tool, and what policy around forward/backward migrations.

## Decision

Adopt **`golang-migrate`** (the `migrate/migrate:v4` container image) as the migration runner for local development and for the production Cloud Run Job (Phase 5 onward).

**File layout** under `db/migrations/`:

```
{14-digit-version}_{snake_case_name}.up.sql
{14-digit-version}_{snake_case_name}.down.sql
```

Every version has both halves. Filenames are validated by `scripts/migrate-lint.sh`, which is run by CI and by `make migrate-lint`.

**Invocation:**

- Local: `make db-migrate` runs `docker compose ... run --rm migrate up` against the dev Postgres. Companion targets `db-migrate-down` (rolls back one) and `db-migrate-version` (prints current applied version) are provided.
- CI: the e2e workflow already calls `make db-migrate` against the same dev stack and continues to work unchanged.
- Production (Phase 5+): a `migrate-staging` / `migrate-prod` Cloud Run Job runs the same `migrate/migrate:v4` image with the `db/migrations/` directory baked in. The deploy pipeline executes the Job synchronously and aborts on non-zero exit.

**Migration policy (forward-only in production, additive online):**

1. **`down` migrations exist for local dev only.** Production never executes `migrate down`. Rollbacks in production are forward-only: write a new migration that reverses the change, and deploy it.
2. **Expand-contract for destructive changes.** A column or table that is in use must not be dropped or renamed in the same release as the code that stops using it. Pattern:
   - Release N: deploy code that tolerates both the old and the new shape; migration adds the new shape additively.
   - Release N+1: deploy code that only uses the new shape.
   - Release N+2: migration drops the old shape.
3. **Backfills are separate Cloud Run Jobs**, not part of the migration step. A migration must be cheap to run in milliseconds-to-seconds; long data transformations belong in an idempotent backfill Job.
4. **Applied migrations are immutable.** Never edit a migration file after it has run in any non-throwaway environment. Write a new migration to fix instead.
5. **One migration = one logical change.** A migration that mixes a schema change with a data change in the same file is a maintenance hazard and should be split.

## Rationale

### Why golang-migrate over Flyway / Atlas / dbmate

| Tool | Considered | Reason for / against |
|---|---|---|
| **golang-migrate** ✅ chosen | Single static binary distributed as a small container image. Plain SQL files. Postgres advisory lock during run. Familiar `{version}_{name}.(up\|down).sql` convention. Aligns with [ADR 0011](./0011-cloud-portability-principle.md): the migration tool itself is a deploy-time concern, not a runtime dependency, so swapping it later is cheap. |
| Flyway / Liquibase | considered | Most mature option overall, especially in enterprise contexts; language-neutral. Rejected because the official runner is a JVM image (~250 MiB) versus migrate's ~30 MiB, and the team has no JVM elsewhere in the stack. The features we would actually use are a strict subset of what golang-migrate also provides. |
| Atlas | considered | Strong story for declarative schema + versioned migrations, plus schema-diffing. Rejected as overkill for current scale and learning cost; revisit if we ever want declarative schema. |
| dbmate | considered | Thinner than golang-migrate but weaker advisory-lock semantics, smaller community. Net negative versus golang-migrate. |
| Self-rolled | considered | Rejected; reinventing tracking + locking + ordering for no benefit. |

### Why Docker container instead of host binary

Running `migrate` as a sidecar service in `compose.dev.yml` (under the `tools` profile, so it does not start with `dev-up`) means:

- Local DX requires only `docker` and `docker compose`, which the dev stack already requires.
- The same image is used in CI and in the Cloud Run Job (Phase 5+) — one moving piece across environments instead of three.
- No `host.docker.internal` versus `--network host` portability gymnastics across macOS and Linux; the migrate container joins the existing compose network and resolves `postgres` by service name.

### Why `down` migrations are written but never run in production

A pure forward-only convention (Stripe's well-known practice) is fully defensible. The reason this ADR writes `down` migrations anyway is local DX: `make db-migrate-down` lets a contributor iterate on a migration without `db-reset` (which destroys all data). In production, `down` is forbidden because it tends to discard real user data silently, and because a forward-fix migration is auditable in the same way every other change is.

### Why the version format is 14-digit timestamp

Two reasons:

- Deterministic sort matches commit chronology and survives shell-glob ordering across OSes/locales.
- Conflict detection: if two PRs add a migration concurrently, the timestamps make the conflict visible at merge time.

## Consequences

Positive:

- Each deploy can run migrations idempotently. A re-run of an unchanged release is a no-op against the `schema_migrations` table.
- Partial failure is recoverable: golang-migrate marks the row `dirty=true`, and the next run fails fast until a human force-marks the version after manual cleanup. No silent drift.
- A staging-vs-prod drift question becomes "compare `SELECT version FROM schema_migrations`" rather than `\dt` inspection.
- The advisory lock prevents two concurrent deploys from racing migrations against the same database.
- Lint runs in CI in <1 second and catches the most common authoring mistakes (missing pair, wrong filename format) before review.

Negative:

- A first-time contributor needs Docker Compose running before `make db-migrate` works (was already true; no change).
- Maintaining `down` migrations is a small ongoing cost; the convention is to write them as a strict inverse of the `up`, drop the column or table, and not over-engineer.
- The pre-existing schema drift between `20251202202700_asr_results` (which already contains `word_alignments`) and `20260102120000_add_word_alignments` (which adds it defensively with `IF NOT EXISTS`) is preserved as-is, because editing an already-applied migration is forbidden by the policy. New migrations must not introduce similar drift.

## Operational

| Action | Command |
|---|---|
| Apply all pending migrations | `make db-migrate` |
| Roll back one (local only) | `make db-migrate-down` |
| Print current version | `make db-migrate-version` |
| Validate filenames | `make migrate-lint` |
| Full local reset | `make db-reset` (DROPs, CREATEs, then `db-migrate`) |
| Production / staging | Cloud Run Job `migrate-{env}` invoked by the deploy pipeline (Phase 5+) |

If a migration fails in any environment:

1. Inspect the error.
2. If state is `dirty`, fix the underlying SQL by writing a *new* corrective migration (do not edit the failing file if it has run in any non-throwaway env).
3. After applying the corrective migration, force the version with `migrate force <version>` only after confirming the schema is in the intended state. Document the incident in `docs/runbooks/`.

## Alternatives Considered

- **Stay on the `psql` script.** Rejected on the grounds enumerated in the deployment plan: no tracking, no advisory lock, no recovery, incompatible with the Cloud Run Job deploy model in ADR 0010.
- **Embed migrations in app startup.** Rejected: couples deploy timing to container boot, complicates Cloud Run revisions, and racing instances would each attempt the migration. The 12-factor recommendation of a separate admin process is also what golang-migrate's CLI is.
- **Adopt an ORM with built-in migrations (Prisma, Drizzle).** Rejected: backend is in Go without an ORM, and adopting one only for migrations is the tail wagging the dog.

## References

- `db/migrations/` — 14 files (7 versions × 2 directions) after the split
- `Makefile` — `db-migrate`, `db-migrate-down`, `db-migrate-version`, `migrate-lint` targets
- `ops/docker/compose.dev.yml` — `migrate` service under the `tools` profile
- `scripts/migrate-lint.sh` — filename validation
- `.github/workflows/ci.yml` — replaces the obsolete `sql-migrate` step with `migrate-lint`
- `.github/workflows/e2e.yml` — continues to call `make db-migrate` unchanged
- Internal deployment plan — Phase 1 / Phase 5
