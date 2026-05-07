FROM node:20-slim

WORKDIR /app

COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY packages ./packages
COPY apps ./apps
COPY schemas ./schemas

RUN corepack enable && pnpm install --frozen-lockfile
RUN pnpm --filter @quran-project/shared-ts build

WORKDIR /app/apps/bff

EXPOSE 4000

CMD ["pnpm", "dev"]
