# Backend (Go)

Go HTTP server that serves Surah / Ayah data and accepts ASR scoring jobs. Listens on `:8080` and is the upstream that BFF proxies to.

## Endpoints

| Method | Path | Purpose |
|---|---|---|
| GET | `/healthz` | Health check |
| GET | `/api/surahs` | List Surahs |
| GET | `/api/surahs/{id}` | Surah detail |
| GET | `/api/surahs/{id}/ayahs` | List Ayahs for a Surah |

Scoring-related endpoints live under `internal/`.

## Environment Variables

| Variable | Default | Purpose |
|---|---|---|
| `PORT` | `8080` | Listen port |
| `DATABASE_URL` | — | Postgres DSN (required) |
| `OTEL_EXPORTER_OTLP_ENDPOINT` | — | OTLP collector endpoint (optional) |

## Build / Run

The fastest path is Docker Compose:

```bash
make dev-up   # boots backend along with the rest of the stack
```

To run directly on the host:

```bash
DATABASE_URL=postgres://app:app@localhost:5432/app?sslmode=disable \
  go run ./apps/backend/cmd/server
```

## Tests

```bash
# Unit tests only
make go-test

# Integration tests (spins up Postgres / Redis via Docker)
make go-test-integration

# Unit + integration
make go-test-all

# Coverage (80% threshold)
make go-test-coverage-check
open coverage.html
```

## Formatting

```bash
make go-fmt          # gofmt -w
make go-fmt-check    # CI-equivalent check
```

## Migrations

Schema lives under `db/migrations/`. See [`ops/README.md`](../../ops/README.md) for details.
