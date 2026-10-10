# TerraMorph backend

Fastify + TypeScript + Prisma service for the TerraMorph client portal. PostgreSQL-backed, with cookie-based authentication and workspace-scoped (multi-tenant) reads.

## Requirements

- Node.js 20+
- PostgreSQL 14+ (Neon works well)
- npm

## Configuration

Two database URLs are used, and they must be different roles:

| Variable | Role | Used for |
| --- | --- | --- |
| `DATABASE_URL` | `terramorph_app` (least privilege) | every query the API makes at runtime |
| `DIRECT_URL` | schema owner | migrations and seeding only |

Also required:

- `SESSION_SECRET` — HMAC key used to hash session tokens at rest.
- `FRONTEND_ORIGIN` — exact browser origin allowed by CORS (e.g. `http://localhost:8443`).
- `SEED_ADMIN_PASSWORD` — only for `npm run prisma:seed`; must be at least 12 characters.

Copy `.env.example` to `.env` and fill it in. `.env` is gitignored and must never be committed.

```bash
npm install
npx prisma generate
npx prisma migrate deploy   # uses DIRECT_URL
npm run prisma:seed
npm run dev
```

## Scripts

- `npm run dev` — development server with reload (port 4000)
- `npm run build` / `npm run typecheck` — compile or type-check
- `npm start` — run the compiled server
- `npm run lint` / `npm run lint:fix` — ESLint
- `npm test` — Vitest (48 tests)
- `npm run check` — typecheck, lint and tests in one go
- `npm run prisma:migrate` — create a development migration (owner)
- `npm run prisma:deploy` — apply checked-in migrations (owner)
- `npm run prisma:seed` — load the seven assignments, six experts and the activity feed

### Verification and operations

- `npm run probe:smoke` — 19 end-to-end checks against a **running** server: unauthenticated requests are refused, login sets an HttpOnly cookie, reads return data, pagination behaves, bad passwords are rejected, logout invalidates the session. PowerShell only.
- `npm run probe:tenancy` — creates a second tenant and proves neither can see the other's assignments, totals or activity.
- `npm run db:privileges` — re-apply the least-privilege grants (idempotent). Pass a database name to target another one, e.g. `npm run db:privileges -- terramorph_test`.
- `npm run db:privileges:inspect` — print the runtime role's actual privileges.

## Authentication

Passwords are hashed with scrypt. Login creates a random 256-bit token, stores **only** its HMAC-SHA256 digest, and sets it as the `tm_session` cookie (`HttpOnly`, `SameSite=Lax`, `Secure` in production). Every authenticated request re-checks that the session is unexpired and that the user still belongs to the workspace.

- `POST /api/v1/auth/login` — sets the session cookie
- `POST /api/v1/auth/logout` — destroys the session (accepts a bodyless request)
- `GET  /api/v1/auth/me` — current user, workspace and role
- `POST /api/v1/auth/password` — changes the password and logs out other devices

Unknown email and wrong password return the identical error so accounts cannot be enumerated.

## Data access

`GET /health`

Authenticated, and always scoped to the caller's workspace:

- `GET /api/v1/dashboard/summary`
- `GET /api/v1/assignments?status=ON_TRACK&search=map&page=1&pageSize=20`
- `GET /api/v1/assignments/:id`
- `GET /api/v1/experts?page=1&pageSize=20`
- `GET /api/v1/activity?limit=20&cursor=<nextCursor>`

Assignment statuses are `ON_TRACK`, `AT_RISK` and `BLOCKED`; workflow stages are `G0`–`G7`. List endpoints return `{ items, pagination: { page, pageSize, total, totalPages } }`; activity returns `{ items, nextCursor }`. Validation failures return `400` with `{ error: { code, message } }`, missing resources `404`, and unexpected failures `500`.

### Least-privilege runtime role

`terramorph_app` cannot create schemas, tables or roles, and holds only what the API uses:

| Object | Privileges |
| --- | --- |
| `Assignment`, `Expert`, `ActivityLog`, `Workspace`, `WorkspaceMember` | `SELECT` |
| `Session` | `SELECT`, `INSERT`, `DELETE` |
| `User` | `SELECT`, `UPDATE` on `passwordHash` and `updatedAt` only |

Note the two `User` columns: Prisma's `@updatedAt` writes `updatedAt` on every update, so both are required or a password change fails with `permission denied`.

23 pre-existing lowercase tables were moved to a `legacy` schema so Prisma could adopt the database without touching unmanaged data. The runtime role has no access to it; it is owned by the migration role only.

## Tests

`npm test` runs three suites: password hashing units, API integration (auth, tenancy, pagination, validation) against the `terramorph_test` database, and a privilege-regression suite that connects as `terramorph_app` and asserts the grants above are still correct. The integration suite runs as the owner, which is why the separate privilege suite exists.