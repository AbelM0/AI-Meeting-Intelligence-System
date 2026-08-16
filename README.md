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

3. Copy `.env.example` to `.env`. Also copy `packages/database/.env.example` to `packages/database/.env` and `apps/web/.env.example` to `apps/web/.env.local`. Set the database, Clerk, and Supabase values before starting the application.
4. Start Redis for the local Node.js workflow:

   ```bash
   docker compose up -d redis
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

To build and run the complete application through Docker, first make sure the
root `.env` contains the database, Supabase, and Deepgram values required by the
API. The public frontend values are supplied while the Next.js image is built.

```bash
pnpm db:deploy
docker compose up --build -d
docker compose ps
```

Run `pnpm db:deploy` whenever a new Prisma migration is added, before starting
or restarting the production API. It applies only unapplied migrations and does
not remove existing transcript data. The command needs `DATABASE_URL` in the
shell environment or in `packages/database/.env`.

This creates and runs three containers:

- `web` — Next.js production frontend at <http://localhost:3000>
- `api` — NestJS production API at <http://localhost:3001>
- `redis` — BullMQ Redis queue at `localhost:6379`

The images are tagged `meeting-intelligence-web:local` and
`meeting-intelligence-api:local`. Stop the stack with:

```bash
docker compose down
```

If the frontend or API host ports are changed, update `WEB_PORT`, `API_PORT`,
`FRONTEND_URL`, and `NEXT_PUBLIC_API_URL` in the root `.env` before rebuilding
the web image.

## Local URLs

- Frontend: <http://localhost:3000>
- Backend: <http://localhost:3001>
- Health check: <http://localhost:3001/api/v1/health>

## Environment configuration

The API loads `apps/api/.env` first and then the root `.env`. For the simplest setup, keep backend variables in the root `.env`. Prisma CLI resolves its environment relative to `packages/database`, so put `DATABASE_URL` in `packages/database/.env` (or export it in your shell). Next.js loads browser configuration from `apps/web/.env.local`; browser-readable values must use the `NEXT_PUBLIC_` prefix.

Create a private Supabase Storage bucket named `meeting-audio`. The API checks that this bucket is private before authorizing an upload. The service-role key belongs only in the backend/root environment; never add it to a `NEXT_PUBLIC_` variable.

### Clerk setup

1. Create a Clerk application and configure the desired MVP sign-in methods.
2. Copy its publishable key to `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` in `apps/web/.env.local` and to backend-only `CLERK_PUBLISHABLE_KEY` in the root `.env`.
3. Copy the secret key to backend-only `CLERK_SECRET_KEY`.
4. Optionally copy the PEM JWT public key to `CLERK_JWT_KEY` for networkless verification.
5. Set `CLERK_AUTHORIZED_PARTIES` to the comma-separated legitimate frontend origins (normally `http://localhost:3000` locally). Keep `FRONTEND_URL` aligned for CORS.
6. Add a Clerk webhook endpoint for `user.created`, `user.updated`, and `user.deleted` at `https://your-api.example/api/v1/webhooks/clerk`, then copy its signing secret to backend-only `CLERK_WEBHOOK_SECRET`. Use any secure tunnel during local development; do not add its transient URL to source control.

Clerk is the authentication and user-management provider. Supabase remains limited to PostgreSQL and private audio Storage. The API verifies every Clerk bearer token independently; the browser never receives the Clerk secret, JWT key, or webhook secret.

The ownership migration preserves pre-Clerk rows by assigning them to `legacy_unassigned`. After your first Clerk login has synchronized its local `User` row, claim legacy development meetings with this SQL (replace the value with your actual Clerk `user_...` ID):

```sql
UPDATE "Meeting" SET "userId" = 'user_yourClerkId' WHERE "userId" = 'legacy_unassigned';
```

Verify the reassignment before optionally removing the holding user:

```sql
SELECT "userId", COUNT(*) FROM "Meeting" GROUP BY "userId";
DELETE FROM "User" WHERE "id" = 'legacy_unassigned' AND NOT EXISTS (
  SELECT 1 FROM "Meeting" WHERE "userId" = 'legacy_unassigned'
);
```

Deletion webhooks deliberately anonymize the local profile while preserving owned meetings for retention. They never cascade-delete meeting data.

| Variable                            | Purpose                                               |
| ----------------------------------- | ----------------------------------------------------- |
| `DATABASE_URL`                      | PostgreSQL/Supabase connection string used by Prisma  |
| `FRONTEND_URL`                      | Allowed browser origin for API CORS                   |
| `CLERK_AUTHORIZED_PARTIES`          | Allowed Clerk token originating frontend origins      |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | Browser-safe Clerk publishable key                    |
| `CLERK_PUBLISHABLE_KEY`             | Backend Clerk publishable key                         |
| `CLERK_SECRET_KEY`                  | Server-only Clerk API and verification secret         |
| `CLERK_JWT_KEY`                     | Optional server-only PEM key for offline verification |
| `CLERK_WEBHOOK_SECRET`              | Server-only Clerk webhook signing secret              |
| `NEXT_PUBLIC_API_URL`               | Browser-facing base URL for the REST API              |
| `API_PORT`, `WEB_PORT`              | Host ports published by the Docker Compose services   |
| `REDIS_HOST`, `REDIS_PORT`          | Local or hosted Redis connection                      |
| `REDIS_URL`                         | Optional Redis URL overriding host and port           |
| `SUPABASE_URL`                      | Supabase project URL                                  |
| `SUPABASE_SERVICE_ROLE_KEY`         | Server-only Supabase administrative key               |
| `SUPABASE_AUDIO_BUCKET`             | Private recording bucket (default `meeting-audio`)    |
| `MAX_AUDIO_FILE_SIZE_MB`            | Backend recording size limit (default `50`)           |
| `NEXT_PUBLIC_SUPABASE_URL`          | Browser-safe Supabase project URL                     |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY`     | Browser-safe Supabase anonymous key                   |
| `DEEPGRAM_API_KEY`                  | Server-only Deepgram speech-to-text credential        |
| `DEEPGRAM_TRANSCRIPTION_MODEL`      | Deepgram transcription model (default `nova-3`)       |
| `DEEPGRAM_DIARIZATION_MODEL`        | Deepgram diarization model (default `latest`)         |
| `FFMPEG_PATH`                       | FFmpeg executable path (default `ffmpeg`)             |
| `FFPROBE_PATH`                      | FFprobe executable path (default `ffprobe`)           |
| `DEEPSEEK_API_KEY`                  | Server-only DeepSeek credential                       |
| `DEEPSEEK_MODEL`                    | Analysis model (default `deepseek-v4-flash`)          |
| `DEEPSEEK_BASE_URL`                 | DeepSeek-compatible API base URL                      |
| `DEEPSEEK_MAX_TRANSCRIPT_TOKENS`    | Single-pass transcript guard (default `100000`)       |

Never commit real credentials. All `.env*` files except `.env.example` are ignored.

## Commands

| Command            | Description                                           |
| ------------------ | ----------------------------------------------------- |
| `pnpm dev`         | Run development applications through Turbo            |
| `pnpm build`       | Build packages and applications in dependency order   |
| `pnpm lint`        | Lint every workspace                                  |
| `pnpm typecheck`   | Type-check every workspace                            |
| `pnpm format`      | Format the repository with Prettier                   |
| `pnpm db:generate` | Generate the Prisma client                            |
| `pnpm db:migrate`  | Create/apply a development migration                  |
| `pnpm db:deploy`   | Apply committed migrations in deployment environments |
| `pnpm db:studio`   | Open Prisma Studio                                    |

Redis data is persisted in the Docker volume `redis-data`.

## Meeting processing foundation

The API exposes the asynchronous processing flow at:

- `POST /api/v1/meetings/:id/process` queues an uploaded meeting and returns `202`.
- `GET /api/v1/meetings/:id/status` returns durable meeting and processing state.
- `POST /api/v1/meetings/:id/retry` requeues a failed meeting and returns `202`.
- `POST /api/v1/meetings/:id/reprocess-transcription` deliberately retranscribes a meeting with Deepgram and returns `202`.

`MeetingsService` atomically changes PostgreSQL state to `QUEUED` and resets the meeting's single `ProcessingJob` before `MeetingQueueService` adds the small `{ meetingId }` payload to the `meeting-processing` queue. Queue jobs use the stable ID `meeting-<uuid>` because BullMQ custom IDs cannot contain colons. Completed or failed Redis entries are removed before an allowed manual retry; active database and Redis states reject duplicate work.

The worker fetches the authoritative meeting and audio metadata from PostgreSQL, creates a short-lived signed read URL for the private recording, and sends one remote-URL request to Deepgram Nova-3 with punctuation, smart formatting, utterances, and the `latest` diarization model enabled. The normalized response persists one timestamped `Transcript`, its `MeetingSpeaker` rows, and speaker-labelled `TranscriptSegment` rows atomically before the deterministic transcript representation is sent to the server-side DeepSeek provider for summary, decision, and action-item extraction. Each response is parsed as JSON and validated with the shared Zod schemas before any intelligence is persisted. `PREPROCESSING` starts at 10%, the synchronous transcription-plus-diarization stage moves from 20% to 68%, analysis stages report 78%, 85%, and 92%, persistence reports 97%, and completion is 100%. Each transition updates both the meeting and its `ProcessingJob` transactionally, while BullMQ progress is secondary. Automatic failures retry at most three times with exponential backoff; terminal failures persist a safe error and move both records to `FAILED`. Redis retains up to 100 completed jobs for one hour and 100 failed jobs for one day.

When a retry finds a valid transcript, the worker skips Deepgram and resumes at DeepSeek analysis. This preserves the transcript after an analysis failure and avoids unnecessary transcription spend. Intelligence persistence is replacement-based inside one transaction: the summary is upserted and generated decisions/action items are replaced only after all three model outputs pass parsing and validation. The normal path intentionally does not chunk recordings; future hardening for unusually large or complex recordings should use Deepgram's asynchronous callback API so speaker IDs remain continuous.

The meeting results API is available at `GET /api/v1/meetings/:id/intelligence`. Action-item status changes use `PATCH /api/v1/action-items/:id` with `{ "status": "OPEN" | "IN_PROGRESS" | "COMPLETED" }`. The web Overview tab reads these durable records after completion; the Transcript tab remains available independently.

PostgreSQL remains the browser-visible source of truth across refreshes and app restarts. BullMQ provides its normal stalled-job and retry recovery, but this local milestone runs the API and worker in the same NestJS process; it does not add separate worker deployment, distributed reconciliation, WebSockets, or AI processing.
