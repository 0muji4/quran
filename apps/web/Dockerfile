FROM node:20-slim

WORKDIR /app

COPY package.json pnpm-workspace.yaml ./
COPY packages ./packages
COPY apps/web ./apps/web

RUN corepack enable && pnpm install --filter @quran-project/web...

WORKDIR /app/apps/web

EXPOSE 3000

CMD ["pnpm", "dev", "--", "--hostname", "0.0.0.0", "--port", "3000"]
