# AI Meeting Intelligence System

Production-oriented monorepo foundation for an AI meeting intelligence platform. This repository currently contains infrastructure and framework setup only; application features have not been implemented.

## Workspace

- `apps/web` — Next.js 16 App Router frontend
- `apps/api` — NestJS REST API
- `packages/database` — Prisma client package for PostgreSQL
- `packages/schemas` — shared Zod schemas
- `packages/types` — shared TypeScript types

## Requirements

- Node.js 20.9 or newer
- pnpm 9 or newer
- Docker with Docker Compose

## Installation

1. Clone the repository and enter its directory.
2. Install dependencies:

   ```bash
   pnpm install
   ```

3. Copy `.env.example` to `.env`. Also copy `packages/database/.env.example` to `packages/database/.env` and `apps/web/.env.example` to `apps/web/.env.local`. Set the database URL before using Prisma against a database.
4. Start Redis:

   ```bash
   docker compose up -d
   ```

5. Generate the Prisma client:

   ```bash
   pnpm db:generate
   ```

6. Start the frontend and API:

   ```bash
   pnpm dev
   ```

The normal local workflow is:

```bash
pnpm install
docker compose up -d
pnpm db:generate
pnpm dev
```

## Local URLs

- Frontend: <http://localhost:3000>
- Backend: <http://localhost:3001>
- Health check: <http://localhost:3001/api/v1/health>

## Environment configuration

The API loads `apps/api/.env` first and then the root `.env`. For the simplest setup, keep backend variables in the root `.env`. Prisma CLI resolves its environment relative to `packages/database`, so put `DATABASE_URL` in `packages/database/.env` (or export it in your shell). Next.js loads `NEXT_PUBLIC_API_URL` from `apps/web/.env.local`; browser-readable values must use the `NEXT_PUBLIC_` prefix.

| Variable                             | Purpose                                              |
| ------------------------------------ | ---------------------------------------------------- |
| `DATABASE_URL`                       | PostgreSQL/Supabase connection string used by Prisma |
| `FRONTEND_URL`                       | Allowed browser origin for API CORS                  |
| `NEXT_PUBLIC_API_URL`                | Browser-facing base URL for the REST API             |
| `REDIS_HOST`, `REDIS_PORT`           | Local or hosted Redis connection                     |
| `SUPABASE_URL`                       | Supabase project URL                                 |
| `SUPABASE_ANON_KEY`                  | Browser-safe Supabase anonymous key                  |
| `SUPABASE_SERVICE_ROLE_KEY`          | Server-only Supabase administrative key              |
| `GROQ_API_KEY`                       | Future Groq integration credential                   |
| `DEEPSEEK_API_KEY`, `DEEPSEEK_MODEL` | Future DeepSeek integration configuration            |

Never commit real credentials. All `.env*` files except `.env.example` are ignored.

## Commands

| Command            | Description                                         |
| ------------------ | --------------------------------------------------- |
| `pnpm dev`         | Run development applications through Turbo          |
| `pnpm build`       | Build packages and applications in dependency order |
| `pnpm lint`        | Lint every workspace                                |
| `pnpm typecheck`   | Type-check every workspace                          |
| `pnpm format`      | Format the repository with Prettier                 |
| `pnpm db:generate` | Generate the Prisma client                          |
| `pnpm db:migrate`  | Create/apply a development migration                |
| `pnpm db:studio`   | Open Prisma Studio                                  |

Redis data is persisted in the Docker volume `redis-data`.
