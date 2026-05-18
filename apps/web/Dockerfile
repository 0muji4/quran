# syntax=docker/dockerfile:1.7

# ---- deps: install all workspace deps with the frozen lockfile ----
FROM node:26-slim AS deps
WORKDIR /app
RUN corepack enable

COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY apps/web/package.json ./apps/web/
COPY apps/bff/package.json ./apps/bff/
COPY packages/shared-ts/package.json ./packages/shared-ts/
COPY packages/ui/package.json ./packages/ui/
COPY packages/ts-config/package.json ./packages/ts-config/
COPY packages/eslint-config/package.json ./packages/eslint-config/
COPY packages/go-pkg/package.json ./packages/go-pkg/

RUN pnpm install --frozen-lockfile

# ---- builder: produce Next.js standalone bundle ----
FROM deps AS builder
ENV NEXT_TELEMETRY_DISABLED=1
COPY packages ./packages
COPY apps/web ./apps/web

# Build shared workspace deps before the web app so transpilePackages picks
# up real .js/.d.ts output. `output: "standalone"` in next.config.mjs writes
# a self-contained bundle to apps/web/.next/standalone.
RUN pnpm --filter @quran-project/shared-ts build \
    && pnpm --filter @quran-project/ui build \
    && pnpm --filter @quran-project/web build

# ---- runtime: distroless nodejs, non-root ----
FROM gcr.io/distroless/nodejs20-debian12:nonroot
WORKDIR /app

ENV NODE_ENV=production \
    PORT=3000 \
    HOSTNAME=0.0.0.0

# standalone/ contains server.js + a flat node_modules; .next/static is
# not bundled and must be copied alongside it. apps/web has no public/
# directory, so it is intentionally omitted. See:
# https://nextjs.org/docs/pages/api-reference/next-config-js/output
COPY --from=builder --chown=nonroot:nonroot /app/apps/web/.next/standalone ./
COPY --from=builder --chown=nonroot:nonroot /app/apps/web/.next/static ./apps/web/.next/static

USER nonroot

EXPOSE 3000

# Distroless nodejs has no shell, so the HEALTHCHECK uses node itself to
# make an HTTP GET against /healthz (defined at apps/web/app/healthz/route.ts).
HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
    CMD ["/nodejs/bin/node", "-e", "require('http').get('http://127.0.0.1:3000/healthz',r=>process.exit(r.statusCode===200?0:1)).on('error',()=>process.exit(1))"]

# Image ENTRYPOINT is `/nodejs/bin/node`, so this runs `node apps/web/server.js`.
CMD ["apps/web/server.js"]
