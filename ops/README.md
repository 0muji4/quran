# Ops — Local Dev Stack

Docker Compose tooling for spinning up web / bff / backend / worker together with their dependencies (Postgres / Redis / MinIO) and the observability stack.

## Prerequisites

- Docker / Docker Compose
- GNU Make (for the convenience targets)
- pnpm (run `pnpm install` at the repo root before starting)

## Bring the stack up / down

The fastest path is to use `make` from the repo root. The compose file lives at `ops/docker/compose.dev.yml`.

```bash
# Bring everything up (web / bff / backend / worker / infra / observability)
make dev-up

# Stop
make dev-down

# Tail logs
make dev-logs

# Tear down including volumes (database data is wiped)
docker compose -f ops/docker/compose.dev.yml down -v
```

Published ports after `make dev-up`:

| Service       | URL                   |
| ------------- | --------------------- |
| Web           | http://localhost:3000 |
| BFF           | http://localhost:4000 |
| Backend (Go)  | http://localhost:8080 |
| Postgres      | localhost:5432        |
| Redis         | localhost:6379        |
| MinIO API     | http://localhost:9000 |
| MinIO Console | http://localhost:9001 |

Observability URLs and OTLP endpoints are documented in [`observability/README.md`](./observability/README.md).

## Partial bring-up

```bash
# Dependencies only
docker compose -f ops/docker/compose.dev.yml up -d postgres minio redis

# App services only (assumes dependencies are already running)
docker compose -f ops/docker/compose.dev.yml up --build web bff backend worker
```

## Database migrations and seed data

Helpers in the root Makefile apply each file in `db/migrations/` in order:

```bash
make db-migrate   # apply all migrations
make db-seed      # load reference Quran data + demo fixtures
make db-status    # list current tables
make db-shell     # open psql
make db-reset     # DROP → CREATE → migrate (destructive)
```

`make db-seed` loads two files in this order:

1. `db/seed_quran.sql` — reference data: 114 surahs and 6,236 ayahs, generated
   from [risan/quran-json](https://github.com/risan/quran-json) (Tanzil
   Uthmani text). Regenerate via `pnpm gen:quran-seed`.
2. `db/seed.sql` — demo fixtures (mock users, sample attempts, etc.).

If you prefer `sql-migrate`, drop a `dbconfig.yml` at the repo root and run:

```bash
make sql-migrate-dry-run
```

## MinIO CORS

```bash
make minio-cors
```

## Troubleshooting

- **Port conflict**: check whether 4000 / 6379 / 5432 / 8080 is held by another host process with `lsof -iTCP:<port> -sTCP:LISTEN`.
- **502 from BFF**: BFF proxies to backend. Verify `backend` is `Up` in `docker compose ps` and that `/healthz` returns 200, then narrow down.
- **`relation "..." does not exist`**: run `make db-migrate && make db-seed`.
