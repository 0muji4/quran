# Backend (Go)

Go server that serves Surah / Ayah data and accepts ASR scoring jobs. Listens on `:8080` and is the upstream that BFF proxies to. gRPC and REST share this port because Cloud Run exposes one port per service. The [gRPC decision record](../../docs/adr/0025-grpc-between-bff-and-backend.md) explains the design.

## Endpoints

| Method | Path                     | Purpose                |
| ------ | ------------------------ | ---------------------- |
| GET    | `/healthz`               | Health check           |
| GET    | `/api/surahs`            | List Surahs            |
| GET    | `/api/surahs/{id}`       | Surah detail           |
| GET    | `/api/surahs/{id}/ayahs` | List Ayahs for a Surah |

Scoring-related endpoints live under `internal/`.

## gRPC

`schemas/proto/quran/v1` defines `quran.v1.SurahService` and `quran.v1.ScoringService`, served over cleartext HTTP/2 on the same port. After editing a schema, run `make proto-gen` and commit the generated code.

## Environment Variables

| Variable                      | Default | Purpose                                   |
| ----------------------------- | ------- | ----------------------------------------- |
| `PORT`                        | `8080`  | Listen port                               |
| `DATABASE_URL`                | —       | Postgres DSN (required)                   |
| `BACKEND_AUTH_TOKEN`          | —       | Bearer token callers must send (required) |
| `OTEL_EXPORTER_OTLP_ENDPOINT` | —       | OTLP collector endpoint (optional)        |

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
