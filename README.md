# AI Meeting Intelligence System

Production-oriented monorepo for an AI meeting intelligence platform. Meetings can be created and managed, each meeting can securely attach one recording in private Supabase Storage, and a BullMQ worker runs the durable meeting-processing lifecycle asynchronously.

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

3. Copy `.env.example` to `.env`. Also copy `packages/database/.env.example` to `packages/database/.env` and `apps/web/.env.example` to `apps/web/.env.local`. Set the database and Supabase values before using recording uploads.
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

The API loads `apps/api/.env` first and then the root `.env`. For the simplest setup, keep backend variables in the root `.env`. Prisma CLI resolves its environment relative to `packages/database`, so put `DATABASE_URL` in `packages/database/.env` (or export it in your shell). Next.js loads browser configuration from `apps/web/.env.local`; browser-readable values must use the `NEXT_PUBLIC_` prefix.

Create a private Supabase Storage bucket named `meeting-audio`. The API checks that this bucket is private before authorizing an upload. The service-role key belongs only in the backend/root environment; never add it to a `NEXT_PUBLIC_` variable.

| Variable                                    | Purpose                                              |
| ------------------------------------------- | ---------------------------------------------------- |
| `DATABASE_URL`                              | PostgreSQL/Supabase connection string used by Prisma |
| `FRONTEND_URL`                              | Allowed browser origin for API CORS                  |
| `NEXT_PUBLIC_API_URL`                       | Browser-facing base URL for the REST API             |
| `REDIS_HOST`, `REDIS_PORT`                  | Local or hosted Redis connection                     |
| `REDIS_URL`                                 | Optional Redis URL overriding host and port          |
| `PROCESSING_SIMULATION_DELAY_MS`            | Development delay per simulated stage (default 1200) |
| `SIMULATE_MEETING_PROCESSING_FAILURE_STAGE` | Development-only failure stage for testing           |
| `SUPABASE_URL`                              | Supabase project URL                                 |
| `SUPABASE_SERVICE_ROLE_KEY`                 | Server-only Supabase administrative key              |
| `SUPABASE_AUDIO_BUCKET`                     | Private recording bucket (default `meeting-audio`)   |
| `MAX_AUDIO_FILE_SIZE_MB`                    | Backend recording size limit (default `50`)          |
| `NEXT_PUBLIC_SUPABASE_URL`                  | Browser-safe Supabase project URL                    |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY`             | Browser-safe Supabase anonymous key                  |
| `GROQ_API_KEY`                              | Future Groq integration credential                   |
| `DEEPSEEK_API_KEY`, `DEEPSEEK_MODEL`        | Future DeepSeek integration configuration            |

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

## Meeting processing foundation

The API exposes the asynchronous processing flow at:

- `POST /api/v1/meetings/:id/process` queues an uploaded meeting and returns `202`.
- `GET /api/v1/meetings/:id/status` returns durable meeting and processing state.
- `POST /api/v1/meetings/:id/retry` requeues a failed meeting and returns `202`.

`MeetingsService` atomically changes PostgreSQL state to `QUEUED` and resets the meeting's single `ProcessingJob` before `MeetingQueueService` adds the small `{ meetingId }` payload to the `meeting-processing` queue. Queue jobs use the stable ID `meeting-<uuid>` because BullMQ custom IDs cannot contain colons. Completed or failed Redis entries are removed before an allowed manual retry; active database and Redis states reject duplicate work.

The worker fetches the authoritative meeting and audio metadata from PostgreSQL, then simulates `PREPROCESSING` (10%), `TRANSCRIBING` (30%), `ANALYZING` (70%), and `COMPLETED` (100%). Each transition updates both the meeting and its `ProcessingJob` transactionally, while BullMQ progress is secondary. Automatic failures retry at most three times with exponential backoff; terminal failures persist a safe error and move both records to `FAILED`. Redis retains up to 100 completed jobs for one hour and 100 failed jobs for one day.

For a development-only failure check, set `SIMULATE_MEETING_PROCESSING_FAILURE_STAGE=TRANSCRIBING`. This setting is ignored when `NODE_ENV=production`.

PostgreSQL remains the browser-visible source of truth across refreshes and app restarts. BullMQ provides its normal stalled-job and retry recovery, but this local milestone runs the API and worker in the same NestJS process; it does not add separate worker deployment, distributed reconciliation, WebSockets, or AI processing.
