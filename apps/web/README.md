# Web

Next.js (App Router only) + React + TypeScript front end. Calls the BFF (`:4000`) for RSC and REST data. Default port `:3000`.

## App Router

This app is **App Router only** — `pages/` is not used. Shared client / server types and helpers live under `apps/web/app/lib`.

## Environment Variables

| Variable | Default | Purpose |
|---|---|---|
| `PORT` | `3000` | Next.js port |
| `BFF_URL` | `http://localhost:4000` | BFF endpoint |

## Local Development

Via Docker Compose:

```bash
make dev-up
```

On the host:

```bash
pnpm --filter @quran-project/web dev
```

## Build / Production

```bash
pnpm --filter @quran-project/web build
pnpm --filter @quran-project/web start
```

## Tests

```bash
# Unit / component (Vitest)
pnpm --filter @quran-project/web test

# Coverage
pnpm --filter @quran-project/web test:coverage
open apps/web/coverage/index.html

# End-to-end (Playwright)
pnpm run test:e2e
```

## Lint / Typecheck

```bash
pnpm --filter @quran-project/web lint
pnpm --filter @quran-project/web typecheck
```
