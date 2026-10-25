import 'dotenv/config'
import { z } from 'zod'

const booleanish = z
  .union([z.boolean(), z.string()])
  .transform((value) => (typeof value === 'boolean' ? value : ['1', 'true', 'yes', 'on'].includes(value.toLowerCase())))

const schema = z.object({
  DATABASE_URL: z.string().startsWith('postgres'),
  PORT: z.coerce.number().int().positive().default(4000),
  HOST: z.string().default('0.0.0.0'),
  // One or more browser origins allowed to call the API, comma-separated. The
  // first entry is the canonical origin used in documentation and redirects.
  FRONTEND_ORIGIN: z.string().default('http://localhost:8443'),
  // The workspace whose PUBLISHED content backs the public website. The site's
  // read-only endpoints expose only this tenant's published rows.
  PUBLIC_WORKSPACE_SLUG: z.string().default('terramorph'),
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  SESSION_SECRET: z.string().min(32, 'SESSION_SECRET must be at least 32 characters'),
  SESSION_TTL_HOURS: z.coerce.number().int().positive().default(24 * 14),
  // Absolute idle timeout: a session unused for this long is rejected even if
  // its absolute expiry has not passed. Defaults to the absolute TTL.
  SESSION_IDLE_HOURS: z.coerce.number().int().positive().optional(),
  // Override the session cookie's SameSite. Defaults to 'none' in production
  // (the API and site live on different origins) and 'lax' everywhere else.
  COOKIE_SAMESITE: z.enum(['lax', 'strict', 'none']).optional(),
  // Trust the X-Forwarded-* headers set by the platform's reverse proxy so rate
  // limiting keys on the real client IP, not the proxy's.
  TRUST_PROXY: booleanish.optional(),
  // Rate limits (requests per 15-minute window). Wide open under test so the
  // integration suite's many logins do not exhaust the bucket.
  RATE_LIMIT_MAX: z.coerce.number().int().positive().optional(),
  LOGIN_RATE_LIMIT_MAX: z.coerce.number().int().positive().optional(),
  // In-process scheduled publishing. Every API instance runs the tick; a
  // Postgres advisory lock ensures only one processes a given run, so rolling
  // deployments and multiple instances stay safe. Off under test (the suite
  // calls the job directly), on everywhere else.
  SCHEDULER_ENABLED: booleanish.optional(),
  SCHEDULER_INTERVAL_MS: z.coerce.number().int().min(1_000).default(60_000),
  // Outbound email. Disabled by default so local and test runs are silent and
  // a misconfigured deployment cannot accidentally send mail. `log` writes the
  // rendered message to the server log; `memory` keeps it in-process for tests.
  // A real transactional provider plugs in behind the same sendEmail() call.
  EMAIL_ENABLED: booleanish.optional(),
  EMAIL_PROVIDER: z.enum(['log', 'memory']).default('log'),
  EMAIL_FROM: z.string().min(3).default('TerraMorph <notifications@askterramorph.com>'),
  // Where new site submissions are announced. When unset, admin notices are
  // skipped (receipts to the submitter still send when email is enabled).
  ADMIN_NOTIFICATION_EMAIL: z.string().email().optional(),
  // Password-reset links are single-use and expire quickly. The token itself is
  // never stored; only an HMAC digest is.
  PASSWORD_RESET_TTL_MINUTES: z.coerce.number().int().min(5).max(1_440).default(30),
  // Seed-only values. prisma/seed.ts reads these from the environment directly
  // and enforces its own rules, so the API must not require them to boot.
  SEED_ADMIN_EMAIL: z.string().email().default('admin@askterramorph.com'),
  SEED_ADMIN_PASSWORD: z.string().min(12, 'SEED_ADMIN_PASSWORD must be at least 12 characters').optional(),
  // Optional distinct password for the non-admin seed accounts. When omitted
  // they fall back to SEED_ADMIN_PASSWORD (dev convenience only).
  SEED_LEAD_PASSWORD: z.string().min(12).optional(),
  // Object storage for the media library. S3-compatible: leave STORAGE_DRIVER
  // unset to keep uploads disabled (the UI shows an honest banner) until real
  // credentials are supplied. Any S3-compatible endpoint works.
  STORAGE_DRIVER: z.enum(['s3']).optional(),
  S3_ENDPOINT: z.string().url().optional(),
  S3_BUCKET: z.string().min(1).optional(),
  S3_REGION: z.string().default('auto'),
  S3_ACCESS_KEY_ID: z.string().min(1).optional(),
  S3_SECRET_ACCESS_KEY: z.string().min(1).optional(),
  // Public base URL objects are served from, e.g. a CDN or bucket public URL.
  S3_PUBLIC_BASE_URL: z.string().url().optional(),
  // MinIO and some S3-compatible services need path-style addressing.
  S3_FORCE_PATH_STYLE: booleanish.optional(),
})

const parsed = schema.parse(process.env)

if (parsed.NODE_ENV === 'production' && parsed.SESSION_SECRET.startsWith('change-me')) {
  throw new Error('SESSION_SECRET still holds its placeholder value; set a real secret before deploying')
}

// The in-memory provider exists only to make tests deterministic; it would
// silently drop mail in production.
if (parsed.NODE_ENV === 'production' && parsed.EMAIL_ENABLED && parsed.EMAIL_PROVIDER === 'memory') {
  throw new Error('EMAIL_PROVIDER=memory is not available in production')
}

const isProduction = parsed.NODE_ENV === 'production'
const isTest = parsed.NODE_ENV === 'test'

const corsOrigins = parsed.FRONTEND_ORIGIN.split(',')
  .map((origin) => origin.trim())
  .filter(Boolean)

export const config = {
  ...parsed,
  SESSION_TTL_MS: parsed.SESSION_TTL_HOURS * 60 * 60 * 1000,
  SESSION_IDLE_MS: (parsed.SESSION_IDLE_HOURS ?? parsed.SESSION_TTL_HOURS) * 60 * 60 * 1000,
  CORS_ORIGINS: corsOrigins,
  COOKIE_SAMESITE: parsed.COOKIE_SAMESITE ?? (isProduction ? 'none' : 'lax'),
  TRUST_PROXY: parsed.TRUST_PROXY ?? isProduction,
  RATE_LIMIT_MAX: parsed.RATE_LIMIT_MAX ?? (isTest ? 1_000_000 : 100),
  LOGIN_RATE_LIMIT_MAX: parsed.LOGIN_RATE_LIMIT_MAX ?? (isTest ? 1_000_000 : 10),
  SCHEDULER_ENABLED: parsed.SCHEDULER_ENABLED ?? !isTest,
  SCHEDULER_INTERVAL_MS: parsed.SCHEDULER_INTERVAL_MS,
  EMAIL_ENABLED: parsed.EMAIL_ENABLED ?? false,
  PASSWORD_RESET_TTL_MS: parsed.PASSWORD_RESET_TTL_MINUTES * 60 * 1000,
  isProduction,
  isTest,
  // Uploads are only possible when every credential is present.
  STORAGE_ENABLED: Boolean(
    parsed.STORAGE_DRIVER === 's3' &&
      parsed.S3_ENDPOINT &&
      parsed.S3_BUCKET &&
      parsed.S3_ACCESS_KEY_ID &&
      parsed.S3_SECRET_ACCESS_KEY,
  ),
}

export type Config = typeof config
