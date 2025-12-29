FROM node:20-slim

WORKDIR /app

COPY package.json pnpm-workspace.yaml ./
COPY packages ./packages
COPY apps/bff ./apps/bff

RUN corepack enable && pnpm install --filter @quran-project/bff...

WORKDIR /app/apps/bff

EXPOSE 4000

CMD ["pnpm", "dev"]
