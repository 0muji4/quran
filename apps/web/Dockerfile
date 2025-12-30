FROM node:20-slim

WORKDIR /app

COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY packages ./packages
COPY apps ./apps

RUN corepack enable && pnpm install --frozen-lockfile

WORKDIR /app/apps/web

EXPOSE 3000

CMD ["pnpm", "dev", "-H", "0.0.0.0", "-p", "3000"]
