# quran-project

## Overview
quran-project is a cross-platform pronunciation practice app for Quran recitation. It provides guided practice with model audio, user recording, automated scoring, and review workflows to help learners improve their tajwīd fundamentals.

## Tech Stack
- Web: React + TypeScript (Next.js with RSC)
- BFF: TypeScript (GraphQL + RSC-friendly REST endpoints)
- Backend/Core: Go
- Worker: Go or Python (audio processing + scoring)
- Database: PostgreSQL
- Object Storage: S3-compatible (e.g., MinIO)
- Cache/Queue: Redis
- Containers/Dev: Docker Compose

## Getting Started
### Prerequisites
- Docker & Docker Compose
- Node.js + pnpm
- Go

### Install dependencies
```bash
pnpm install
```

### Build and start the full stack (dev)
```bash
docker compose -f ops/docker/compose.dev.yml up --build
```

This will start:
- Web: http://localhost:3000
- BFF: http://localhost:4000
- Backend: http://localhost:8080
- Postgres: localhost:5432
- MinIO API: http://localhost:9000 (Console: http://localhost:9001)
- Redis: localhost:6379

### Start only dependencies (db/minio/redis)
```bash
docker compose -f ops/docker/compose.dev.yml up -d postgres minio redis
```

### Start only the application services
```bash
docker compose -f ops/docker/compose.dev.yml up --build web bff backend worker
```

### View logs
```bash
docker compose -f ops/docker/compose.dev.yml logs -f
```

### Stop services
```bash
docker compose -f ops/docker/compose.dev.yml down
```

### Reset data (remove volumes)
```bash
docker compose -f ops/docker/compose.dev.yml down -v
```

### Database migrations
SQL migrations live in `db/migrations`. Apply them with your preferred migration tool.
If you use `sql-migrate`, add a `dbconfig.yml` and run a dry-run via:
```bash
make sql-migrate-dry-run
```

## Notes
- See `ops/docker/compose.dev.yml` for local service definitions and environment variables.
- Web/BFF/Backend/Worker are organized under `apps/`.
