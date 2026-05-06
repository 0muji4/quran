# BFF

TypeScript / Express service that exposes GraphQL plus RSC-friendly REST endpoints. Listens on `:4000` and proxies to the Go backend (`apps/backend`) for data.

## Routes

| Method | Path | Purpose |
|---|---|---|
| GET | `/healthz` | Health check |
| GET | `/rsc/surahs` | List Surahs (forwarded to backend) |
| GET | `/rsc/surah/:surahId/ayahs` | List Ayahs for a Surah |
| GET | `/rsc/scores/:sessionId` | Fetch scoring results |
| POST | `/signed-upload-url` | Issue a signed upload URL |
| POST | `/scoring-jobs` | Submit a scoring job |
| GET | `/scoring-jobs/:jobId` | Job status |
| POST | `/auth/refresh` | Refresh access token |
| (GraphQL) | `/graphql` | GraphQL endpoint |

See `apps/bff/src/server/app.ts`, `apps/bff/src/rest/`, and `apps/bff/src/graphql/` for the full mount points.

## Environment Variables

| Variable | Default | Purpose |
|---|---|---|
| `PORT` | `4000` | Listen port |
| `BACKEND_URL` | `http://localhost:8080` | Upstream Go backend URL |
| `JWT_SECRET` / `REFRESH_TOKEN_SECRET` | — | Auth secrets |
| `OTEL_EXPORTER_OTLP_ENDPOINT` | — | OTLP collector endpoint (optional) |

## Local Development

Via Docker Compose:

```bash
make dev-up
```

On the host with hot reload:

```bash
cd apps/bff
pnpm dev          # tsx
pnpm dev:local    # loads .env
```

> If the upstream backend (`:8080`) is not running, `/rsc/*` routes return 502. Either bring up the full stack with `make dev-up` or start `apps/backend` separately.

## Tests

```bash
# Vitest
pnpm --filter @quran-project/bff test
pnpm --filter @quran-project/bff test:watch

# Coverage
make bff-test-coverage
open apps/bff/coverage/index.html
```

## Lint / Format

```bash
pnpm --filter @quran-project/bff lint
pnpm --filter @quran-project/bff typecheck
pnpm --filter @quran-project/bff format:check
```
