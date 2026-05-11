# syntax=docker/dockerfile:1.7

# ---- deps: install all workspace deps with the frozen lockfile ----
FROM node:20-slim AS deps
WORKDIR /app
RUN corepack enable

COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY apps/bff/package.json ./apps/bff/
COPY apps/web/package.json ./apps/web/
COPY packages/shared-ts/package.json ./packages/shared-ts/
COPY packages/ui/package.json ./packages/ui/
COPY packages/ts-config/package.json ./packages/ts-config/
COPY packages/eslint-config/package.json ./packages/eslint-config/
COPY packages/go-pkg/package.json ./packages/go-pkg/

RUN pnpm install --frozen-lockfile

# ---- builder: compile shared-ts then bff ----
FROM deps AS builder
COPY packages ./packages
COPY apps/bff ./apps/bff
COPY schemas ./schemas

RUN pnpm --filter @quran-project/shared-ts build \
    && pnpm --filter @quran-project/bff build

# `pnpm deploy --prod` materialises a self-contained directory at /out with
# a flat node_modules and the bff package — no symlinks, no devDeps, no
# workspace bookkeeping. Required because distroless has no pnpm/npm to
# resolve symlinks at runtime.
RUN pnpm --filter @quran-project/bff deploy --prod /out

# ---- runtime: distroless nodejs, non-root ----
FROM gcr.io/distroless/nodejs20-debian12:nonroot
WORKDIR /app

COPY --from=builder --chown=nonroot:nonroot /out/node_modules ./node_modules
COPY --from=builder --chown=nonroot:nonroot /out/dist ./dist
COPY --from=builder --chown=nonroot:nonroot /out/package.json ./package.json
# bff resolves schemas/graphql/schema.graphql relative to process.cwd().
# It lives at the repo root, not inside the bff workspace, so pnpm deploy
# doesn't pick it up — copy it explicitly.
COPY --from=builder --chown=nonroot:nonroot /app/schemas ./schemas

USER nonroot

ENV NODE_ENV=production
EXPOSE 4000

# Distroless nodejs has no shell, so the HEALTHCHECK uses node itself to
# make an HTTP GET against /healthz. process.exit codes drive the probe.
HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
    CMD ["/nodejs/bin/node", "-e", "require('http').get('http://127.0.0.1:4000/healthz',r=>process.exit(r.statusCode===200?0:1)).on('error',()=>process.exit(1))"]

# The image's ENTRYPOINT is `/nodejs/bin/node`, so CMD args are passed to node.
CMD ["dist/server/server.js"]
