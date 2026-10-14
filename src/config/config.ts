import 'dotenv/config'
import { z } from 'zod'

const schema = z.object({
  DATABASE_URL: z.string().startsWith('postgres'),
  PORT: z.coerce.number().int().positive().default(4000),
  HOST: z.string().default('0.0.0.0'),
  FRONTEND_ORIGIN: z.string().default('http://localhost:5173'),
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  SESSION_SECRET: z.string().min(32, 'SESSION_SECRET must be at least 32 characters'),
  SESSION_TTL_HOURS: z.coerce.number().int().positive().default(24 * 14),
  SEED_ADMIN_EMAIL: z.string().email().default('admin@askterramorph.com'),
  SEED_ADMIN_PASSWORD: z.string().min(12, 'SEED_ADMIN_PASSWORD must be at least 12 characters'),
})

const parsed = schema.parse(process.env)

if (parsed.NODE_ENV === 'production' && parsed.SESSION_SECRET.startsWith('change-me')) {
  throw new Error('SESSION_SECRET still holds its placeholder value; set a real secret before deploying')
}

export const config = {
  ...parsed,
  SESSION_TTL_MS: parsed.SESSION_TTL_HOURS * 60 * 60 * 1000,
}

export type Config = typeof config