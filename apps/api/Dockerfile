FROM node:22-bookworm-slim AS base

ENV PNPM_HOME=/pnpm
ENV PATH=${PNPM_HOME}:${PATH}

WORKDIR /app

RUN corepack enable && corepack prepare pnpm@9.5.0 --activate

FROM base AS dependencies

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml turbo.json ./
COPY apps/api/package.json apps/api/package.json
COPY apps/web/package.json apps/web/package.json
COPY packages/database/package.json packages/database/package.json
COPY packages/schemas/package.json packages/schemas/package.json
COPY packages/types/package.json packages/types/package.json

RUN pnpm install --frozen-lockfile

FROM dependencies AS build

COPY . .

RUN apt-get update \
  && apt-get install -y --no-install-recommends openssl \
  && rm -rf /var/lib/apt/lists/*

RUN pnpm --filter @meeting-intelligence/database db:generate
RUN pnpm --filter @meeting-intelligence/api... build
RUN pnpm --filter @meeting-intelligence/api deploy --prod /prod

# pnpm deploy copies the published @prisma/client package, whose generated
# runtime is only a placeholder. Generate the client inside the deployed
# dependency tree so runtime enums and PrismaClient are available.
RUN prisma_schema="$(find /prod/node_modules/.pnpm -path '*/@meeting-intelligence/database/prisma/schema.prisma' -print -quit)" \
  && test -n "$prisma_schema" \
  && pnpm --filter @meeting-intelligence/database exec prisma generate --schema="$prisma_schema" \
  && cd /prod \
  && node -e "const db = require('@meeting-intelligence/database'); if (!db.MeetingStatus?.PREPROCESSING || !db.ProcessingJobStatus?.PROCESSING || typeof db.PrismaClient !== 'function') process.exit(1)"

FROM node:22-bookworm-slim AS runner

ENV NODE_ENV=production

WORKDIR /app

RUN apt-get update \
  && apt-get install -y --no-install-recommends ca-certificates ffmpeg openssl \
  && rm -rf /var/lib/apt/lists/*

COPY --from=build /prod/ ./

EXPOSE 3001

HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:3001/api/v1/health').then((response) => process.exit(response.ok ? 0 : 1)).catch(() => process.exit(1))"

CMD ["node", "dist/main.js"]
