# TerraMorph backend

Fastify + TypeScript + Prisma API for the TerraMorph client portal and the public marketing site. PostgreSQL-backed, with cookie authentication, workspace-scoped data, a CMS workflow, scheduled publishing, media storage and transactional email hooks.

The complete endpoint reference is in [docs/API.md](docs/API.md).

## Requirements

- Node.js 22.12+ (see `engines` in `package.json`)
- npm
- PostgreSQL 14+ (Neon works well)

## Configuration

Two database URLs are used, and they must authenticate as different roles:

| Variable | Role | Used for |
| --- | --- | --- |
| `DATABASE_URL` | `terramorph_app` (least privilege) | every query the API makes at runtime |
| `DIRECT_URL` | schema owner | migrations, seeding and role/privilege setup |

Required for the API to boot:

- `SESSION_SECRET` — at least 32 characters; HMAC key for session and reset tokens.
- `FRONTEND_ORIGIN` — comma-separated browser origins allowed by CORS and the CSRF Origin check (e.g. `http://localhost:8443`).
- `SEED_ADMIN_PASSWORD` — only for `npm run prisma:seed`; at least 12 characters.

Feature configuration (all optional; defaults shown):

| Variable | Default | Purpose |
| --- | --- | --- |
| `PORT` / `HOST` | `4000` / `0.0.0.0` | HTTP listener. |
| `PUBLIC_WORKSPACE_SLUG` | `terramorph` | Workspace whose published content backs the public site. |
| `SESSION_TTL_HOURS` / `SESSION_IDLE_HOURS` | `336` / same as TTL | Absolute and idle session lifetimes. |
| `COOKIE_SAMESITE` | `none` in production, `lax` otherwise | Cross-site session cookie policy. |
| `TRUST_PROXY` | `true` in production | Trust `X-Forwarded-*` from the platform proxy. |
| `RATE_LIMIT_MAX` / `LOGIN_RATE_LIMIT_MAX` | `100` / `10` per 15 min | Global and authentication-specific limits. |
| `SCHEDULER_ENABLED` / `SCHEDULER_INTERVAL_MS` | on outside tests / `60000` | In-process scheduled publishing. |
| `EMAIL_ENABLED` / `EMAIL_PROVIDER` | `false` / `log` | Outbound mail. `memory` is test-only and rejected in production. |
| `EMAIL_FROM` | `TerraMorph <notifications@askterramorph.com>` | Sender address. |
| `ADMIN_NOTIFICATION_EMAIL` | unset | Destination for new-submission notices; notices are skipped when unset. |
| `PASSWORD_RESET_TTL_MINUTES` | `30` | Single-use reset-link lifetime. |
| `STORAGE_DRIVER` + `S3_*` | unset | Enables media uploads when every S3-compatible credential is present. |
| `SEED_ADMIN_EMAIL` / `SEED_LEAD_PASSWORD` | see `.env.example` | Seeded accounts. |

Copy `.env.example` to `.env` and fill it in. `.env` is gitignored and must never be committed.

## Quick start

```bash
npm ci
cp .env.example .env          # edit the URLs, passwords and SESSION_SECRET
npm run prisma:generate
npm run db:roles              # creates terramorph_app from DB_APP_PASSWORD
npm run prisma:deploy         # applies checked-in migrations as the owner
npm run db:privileges         # applies the runtime grants
npm run prisma:seed           # eleven CMS collections, assignments and experts
npm run dev                   # http://localhost:4000
```

`prisma:seed` is idempotent: it updates the seeded admin password and only creates content that is missing. The public site reads only `PUBLISHED` rows from the `PUBLIC_WORKSPACE_SLUG` workspace.

## Scripts

- `npm run dev` — development server with reload (port 4000)
- `npm run build` — generate Prisma client, apply migrations, compile
- `npm run typecheck` / `npm run lint` — TypeScript and ESLint
- `npm test` / `npm run test:watch` — Vitest
- `npm run check` — typecheck, lint and tests in one go (the CI gate)
- `npm start` — run the compiled server
- `npm run prisma:migrate` — create a development migration (owner)
- `npm run prisma:deploy` — apply checked-in migrations (owner)
- `npm run prisma:seed` — seed the workspace and CMS content
- `npm run db:roles` — create/update the runtime login role
- `npm run db:privileges` — re-apply least-privilege grants (idempotent)
- `npm run db:privileges -- <database>` — target another database, e.g. `terramorph_test`
- `npm run db:privileges:inspect` — print the runtime role's actual privileges
- `npm run probe:smoke` — live end-to-end probes against a running server (PowerShell)
- `npm run probe:tenancy` — proves two tenants cannot see each other's data

## Authentication and sessions

Passwords are hashed with scrypt. Login creates a random 256-bit token, stores **only** its HMAC-SHA256 digest, and sets it as the `tm_session` cookie (`HttpOnly`, `SameSite=Lax` locally / `None; Secure` in production). Every authenticated request re-checks expiry, idle timeout and current workspace membership.

- Unknown email and wrong password return the identical `401 INVALID_CREDENTIALS`.
- Changing a password revokes every other session.
- Forgot-password always returns `202 { ok: true }`, so it cannot be used to enumerate accounts. It only creates a token and sends mail when the account exists and email is enabled.
- Reset tokens are 32 random bytes. Only an HMAC digest is stored; links are single-use, expire after `PASSWORD_RESET_TTL_MINUTES` (30 by default), and a successful reset revokes every reset token and session for that user.

## Scheduled publishing

`content.scheduler.ts` runs once at boot and then every `SCHEDULER_INTERVAL_MS`. Each tick takes a Postgres advisory transaction lock, so multiple API instances or a rolling deploy cannot publish the same item twice. Due `SCHEDULED` items move to `PUBLISHED` through the normal workflow service and write an `AUTO_PUBLISHED` activity entry. Per-item failures are logged and skipped; the tick continues. The scheduler is disabled under `NODE_ENV=test`; integration tests call `publishDueContent()` directly.

## Email

`EMAIL_ENABLED` defaults to `false`, making `sendEmail()` a no-op that logs the skip. `EMAIL_PROVIDER=log` renders messages to the server log; `memory` keeps an in-process outbox for tests and is rejected in production. New submissions produce an admin notice and a submitter receipt when the relevant address is available. Notification failures never turn a recorded submission into a 5xx.

A real transactional provider plugs in behind `sendEmail()` in `src/modules/email/email.service.ts`; the call sites do not need to change.

## Data access and least privilege

The runtime role cannot create schemas, tables or roles. It holds only what the API actually issues:

| Object | Privileges |
| --- | --- |
| `Assignment`, `Expert`, `Workspace`, `WorkspaceMember` | `SELECT` |
| `WorkspaceMember` | `UPDATE ("role")` for member administration |
| `ActivityLog` | `SELECT`, `INSERT` — audit rows are append-only |
| `Submission` | `SELECT`, `INSERT` |
| `Session` | `SELECT`, `INSERT`, `DELETE`, `UPDATE ("lastUsedAt")` |
| `PasswordResetToken` | `SELECT`, `INSERT`, `DELETE` — never updated |
| `User` | `SELECT`, `UPDATE ("passwordHash", "updatedAt")` only |
| `ContentItem`, `Asset`, `SiteSetting` | `SELECT`, `INSERT`, `UPDATE`, `DELETE` |

The grants also include `USAGE` on the public schema and enum types. `npm run db:privileges` clears blanket grants and owner default privileges before re-granting this exact set. Re-run it for every database after migrations, including `terramorph_test`.

## Tests

`npm test` runs five areas: password hashing, API integration (auth, tenancy, pagination, validation, CSRF, content workflow, scheduler, password reset, email, member-role audit), the SQL-level privilege-regression suite, and focused unit tests for email and structured error logging.

The integration suite runs as the owner against `terramorph_test`; the privilege suite connects as `terramorph_app`. Prepare that database once:

```bash
createdb terramorph_test       # or create it in Neon/SQL
DIRECT_URL="<test-database-owner-url>" npx prisma migrate deploy
npm run db:privileges -- terramorph_test
npm test
```

`test/setup.ts` applies any pending migrations to the test database before each run. If a new migration changes grants, re-run `db:privileges -- terramorph_test` or the privilege tests will fail.

GitHub Actions runs the same `npm run check` gate against a disposable Postgres 16 service, including role creation, migrations and grant verification.

## Operations and logging

- `GET /health` is a liveness probe and never touches the database.
- `GET /health/ready` runs `SELECT 1` and returns `503` when the database is unavailable.
- Unhandled request failures log one structured `request.error` record with request ID, method, route pattern, status and error details. Request bodies, headers, cookies, query strings and concrete path values are never logged.
- `uncaughtException` and `unhandledRejection` log structured JSON and shut down gracefully with a non-zero exit code.
- `SIGINT`/`SIGTERM` stop the scheduler, close Fastify and disconnect Prisma.

## Repository notes

The API and frontend are separate git repositories. The frontend consumes the public endpoints (`/api/v1/public/*`) at runtime and at build time; the dashboard consumes the authenticated routes documented above. Keep `src/modules/content/content.registry.ts` in step with the frontend's `src/pages/dashboard/content-model.ts` when adding CMS fields.
