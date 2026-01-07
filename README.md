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

## Test Coverage

We maintain 80%+ test coverage across all packages to ensure code quality and reliability.

### Running Tests Locally

**All tests with coverage:**
```bash
make test-coverage-all
```

**Go tests with coverage:**
```bash
make go-test-coverage-check
```

**TypeScript tests with coverage:**
```bash
pnpm run test:coverage
```

**Individual package tests:**
```bash
# Backend Go tests
make go-test-integration

# BFF tests
pnpm --filter @quran-project/bff test:coverage

# Web tests
pnpm --filter @quran-project/web test:coverage

# UI package tests
pnpm --filter @quran-project/ui test:coverage
```

### View Coverage Reports

After running tests with coverage, you can view detailed HTML reports:

```bash
# Go coverage
open coverage.html

# BFF coverage
open apps/bff/coverage/index.html

# Web coverage
open apps/web/coverage/index.html

# UI coverage
open packages/ui/coverage/index.html
```

### Coverage Thresholds

All packages must maintain minimum coverage thresholds. CI will fail if coverage falls below these levels:

- **Lines**: 80%
- **Functions**: 80%
- **Branches**: 80%
- **Statements**: 80%

### CI Integration

Coverage is automatically checked in CI for every pull request. Coverage artifacts are uploaded and retained for 30 days for inspection.

## Mobile Apps (Android / iOS)
### Android
**Prerequisites**
- Android Studio + Android SDK (API 34, Build Tools 34.x)
- JDK 17
- Gradle (8.x)
- `ANDROID_HOME`/`ANDROID_SDK_ROOT` set and SDK licenses accepted

**Build**
```bash
gradle :apps:android:assembleDebug
```

**Test**
```bash
gradle :apps:android:testDebugUnitTest
```

**Lint**
```bash
gradle :apps:android:lintDebug
```

> Note: Set `BFF_BASE_URL` (Gradle property or env var) to point at your BFF if you are not using the default `http://localhost:4000`.

### iOS
**Prerequisites**
- macOS with Xcode 15+ (Swift 5.9) and iOS 16+ SDK

**Build (Xcode CLI)**
```bash
xcodebuild -scheme QuranRecitationApp -destination "platform=iOS Simulator,name=iPhone 15,OS=latest" build
```

**Test (if/when tests are added)**
```bash
xcodebuild -scheme QuranRecitationApp -destination "platform=iOS Simulator,name=iPhone 15,OS=latest" test
```

**Build (Xcode UI)**
- Open `apps/ios/Package.swift` in Xcode, select the `QuranRecitationApp` scheme, and run.

## Notes
- See `ops/docker/compose.dev.yml` for local service definitions and environment variables.
- Web/BFF/Backend/Worker are organized under `apps/`.
- The Next.js web app (`apps/web`) uses the App Router exclusively; shared client/server types and helpers live under `apps/web/app/lib`.
