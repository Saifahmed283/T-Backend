# TerraMorph API reference

Base URL in development: `http://localhost:4000`. The browser site calls it through the Vike `/api` proxy, so requests are same-origin during local development. In production the site calls `https://api.askterramorph.com` with credentials.

All request and response bodies are JSON unless noted. Requests that carry a body should send `Content-Type: application/json`. Authentication uses the `tm_session` HttpOnly cookie; there is no bearer-token flow.

## Conventions

- **Auth** — `public` routes need no session. `session` routes need a valid `tm_session` cookie. `admin` and `admin/lead` are role checks inside the current workspace.
- **Tenancy** — every authenticated read and write is scoped to the workspace stored on the session. IDs from another workspace return `404`.
- **CSRF** — state-changing requests (`POST`, `PUT`, `PATCH`, `DELETE`) that carry an `Origin` or `Referer` must match `FRONTEND_ORIGIN` (comma-separated). Non-browser clients without either header are allowed.
- **Rate limits** — global default is 100 requests/15 min per IP. Login, forgot and reset use `LOGIN_RATE_LIMIT_MAX` (10/15 min by default); public site content allows 900/15 min; submissions allow 60/15 min.
- **Pagination** — list routes return `{ items, pagination: { page, pageSize, total, totalPages } }`. `pageSize` is capped at 100 (20 by default, 40 for assets).
- **Errors** — every failure uses:

```json
{ "error": { "code": "CODE", "message": "Human-readable message" } }
```

Validation failures add `details` from Zod (`VALIDATION_ERROR`, 400). Unexpected failures return `INTERNAL_ERROR` (500) without internal details.

## Health

| Method | Path | Auth | Notes |
| --- | --- | --- | --- |
| `GET` | `/health` | public | Liveness only; never touches the database. |
| `GET` | `/health/ready` | public | Runs `SELECT 1`. Returns `503` when the database is unreachable. |

## Authentication

| Method | Path | Auth | Rate limit | Notes |
| --- | --- | --- | --- | --- |
| `POST` | `/api/v1/auth/login` | public | tight | Body `{ email, password }`. Sets `tm_session`. Returns `{ user, workspace, role, expiresAt }`. |
| `POST` | `/api/v1/auth/logout` | public | global | Deletes any presented session and clears the cookie. Always `204`. |
| `GET` | `/api/v1/auth/me` | session | global | Returns `{ user: { id, name, email }, workspace: { id, slug }, role }`. A `401` means signed out. |
| `POST` | `/api/v1/auth/password` | session | global | Body `{ currentPassword, newPassword }` (12–200 chars). Changes the password, revokes all sessions and clears the cookie. `204`. |
| `POST` | `/api/v1/auth/password/forgot` | public | tight | Body `{ email }`. Always `202 { ok: true }`, whether or not the account exists. Sends a reset link only if email is enabled and the account exists. |
| `POST` | `/api/v1/auth/password/reset` | public | tight | Body `{ token, newPassword }`. Single-use token, 30-minute default TTL. On success revokes every reset token and session for the user. |

Unknown email and wrong password both return `401 INVALID_CREDENTIALS`. Reset links contain the raw token once; only an HMAC digest is stored.

## Dashboard, assignments and experts

| Method | Path | Auth | Notes |
| --- | --- | --- | --- |
| `GET` | `/api/v1/dashboard/summary` | session | Tiles and counts for the current workspace. |
| `GET` | `/api/v1/assignments` | session | Query `status` (`ON_TRACK`, `AT_RISK`, `BLOCKED`), `search`, `page`, `pageSize`. |
| `GET` | `/api/v1/assignments/:id` | session | Assignment plus its recent activity. |
| `GET` | `/api/v1/experts` | session | Query `status`, `search`, `page`, `pageSize`. |
| `GET` | `/api/v1/activity` | session | Query `limit` (1–100, default 20) and `before` (ISO timestamp cursor). Returns `{ items, nextCursor }`. |

## Submissions

| Method | Path | Auth | Notes |
| --- | --- | --- | --- |
| `POST` | `/api/v1/submissions` | public | Body `{ kind, email?, name?, message?, source?, payload? }`. See kinds below. Returns `201 { id, kind, status, createdAt }`. |
| `GET` | `/api/v1/submissions` | admin | Query `kind`, `page`, `pageSize`. The inbox is platform-wide, not workspace-scoped, so only admins may read it. |

Submission kinds: `CONTACT`, `EXPERT_REGISTRATION`, `SEAT_RESERVATION`, `TENDER_INTEREST`, `TEAM_PROPOSAL`, `JOB_APPLICATION`, `PUBLICATION_REQUEST`, `NEWSLETTER`, `CONTRIBUTION`. An email is required for every kind except `CONTRIBUTION`. Emails are trimmed and lowercased; `message` is capped at 4,000 characters.

When email is enabled the API sends the configured admin a notice and (where applicable) the submitter a receipt. Notification failures are logged and never change the `201`.

## Content workspace

Collection IDs: `assignments`, `cases`, `publications`, `instruments`, `courses`, `experts`, `partners`, `vacancies`, `initiatives`, `audiences`, `stages`.

| Method | Path | Auth | Notes |
| --- | --- | --- | --- |
| `GET` | `/api/v1/content/counts` | session | Totals by status and collection. |
| `GET` | `/api/v1/workflow/board` | session | Up to 50 items per workflow status. |
| `GET` | `/api/v1/content/:collectionId` | session | Query `status`, `search`, `page`, `pageSize`. |
| `POST` | `/api/v1/content/:collectionId` | session | Creates a `DRAFT`. Body below. |
| `GET` | `/api/v1/content/:collectionId/:id` | session | Item plus its last 50 activity entries. |
| `PATCH` | `/api/v1/content/:collectionId/:id` | session | Partial update; same body fields as create. |
| `POST` | `/api/v1/content/:collectionId/:id/transition` | session | Body `{ to }`. Approver targets require `admin` or `lead`. |
| `DELETE` | `/api/v1/content/:collectionId/:id` | admin | Deletes the item after appending an audit entry. |

Create body:

```json
{
  "data": { "title": { "en": "Water reuse", "ar": "إعادة استخدام المياه" } },
  "seo": { "seoTitle": { "en": "…" }, "canonical": "https://…" },
  "slug": "optional-slug",
  "assignmentId": null,
  "sourceReference": null,
  "scheduledPublishAt": "2026-11-01T09:00:00.000Z",
  "scheduledUnpublishAt": null
}
```

- `data` is normalised against the collection registry: unknown keys are dropped, localized fields accept `{ en, ar }`, and empty strings are removed.
- `title` is required for publication. `slug` is generated from the English title when omitted and made unique within the workspace and collection.
- Statuses: `DRAFT`, `REVIEW`, `APPROVED`, `SCHEDULED`, `PUBLISHED`, `UNPUBLISHED`, `ARCHIVED`.
- `SCHEDULED` requires `scheduledPublishAt` (`422 SCHEDULE_REQUIRED`). Publishing clears it. Moving back to `DRAFT` clears `publishedAt` and the schedule.
- Only `admin`/`lead` may move an item to `APPROVED`, `SCHEDULED`, `PUBLISHED`, `UNPUBLISHED` or `ARCHIVED`.
- The scheduler flips due `SCHEDULED` items to `PUBLISHED` every 60 seconds (configurable) and records `AUTO_PUBLISHED` in the activity feed.

## Public site content

These routes are unauthenticated and serve only `PUBLISHED` rows from the workspace named by `PUBLIC_WORKSPACE_SLUG`. Internal fields marked in the registry are stripped. Responses carry `Cache-Control: public, max-age=60, stale-while-revalidate=300`.

| Method | Path | Auth | Notes |
| --- | --- | --- | --- |
| `GET` | `/api/v1/public/content/:collectionId` | public | Query `search`, `page`, `pageSize` (max 100). Returns `{ collectionId, items, total, page, pageSize }`; items are keyed by `slug` and include `data`, `seo`, `publishedAt` and `updatedAt`. |
| `GET` | `/api/v1/public/content/:collectionId/:slug` | public | One published item, or `404 NOT_FOUND`. |
| `GET` | `/api/v1/public/slugs` | public | `{ collections: { [collectionId]: string[] } }` for prerendering and sitemaps. |
| `GET` | `/api/v1/public/settings` | public | The site settings JSON document for the public workspace (`{}` when unset). |

Items whose `scheduledUnpublishAt` has passed are hidden even while their status is still `PUBLISHED`.

## Media library

| Method | Path | Auth | Notes |
| --- | --- | --- | --- |
| `GET` | `/api/v1/assets` | session | Query `search`, `mimeType`, `page`, `pageSize` (max 100, default 40). Includes `storageEnabled`. |
| `POST` | `/api/v1/assets` | session | `multipart/form-data` with one `file` and optional `alt` / `altAr` fields. Max 15 MB. |
| `PATCH` | `/api/v1/assets/:id` | session | Body `{ alt: { en?, ar? } | null }`. |
| `DELETE` | `/api/v1/assets/:id` | admin | Removes the catalogue row and best-effort deletes the stored object. |

Allowed types: PNG, JPEG, WebP, GIF, SVG and PDF. Uploads return `503 STORAGE_NOT_CONFIGURED` when the S3-compatible storage variables are not complete, and `415 UNSUPPORTED_MEDIA_TYPE` for anything outside the allow-list.

## Site settings and members

| Method | Path | Auth | Notes |
| --- | --- | --- | --- |
| `GET` | `/api/v1/settings/site` | session | `{ data, updatedAt }` for the current workspace. |
| `PUT` | `/api/v1/settings/site` | admin/lead | Body `{ data }`; replaces the JSON document and records an activity entry. |
| `GET` | `/api/v1/members` | session | `{ items: [{ userId, name, email, joinedAt, role }] }`. |
| `PATCH` | `/api/v1/members/:userId` | admin | Body `{ role: "admin" | "lead" | "member" }`. |

Role changes are guarded: an admin cannot demote their own account (`409 SELF_DEMOTION_BLOCKED`) and the workspace must retain at least one admin (`409 LAST_ADMIN`). Every successful change appends a `MEMBER_ROLE_CHANGED` activity entry with the actor, target and old/new roles.

## Operational logging

Unhandled request failures write one structured log line (`event: "request.error"`) containing the request ID, method, route pattern, status, error name/message/code and stack. Request bodies, headers, cookies, query strings and concrete path values are deliberately excluded. Process-level `uncaughtException` and `unhandledRejection` events are logged as JSON and trigger a graceful shutdown with a non-zero exit code.
