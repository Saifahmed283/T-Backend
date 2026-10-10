import { z } from 'zod'

export const listQuerySchema = z.object({
  status: z.enum(['ON_TRACK', 'AT_RISK', 'BLOCKED']).optional(),
  search: z.string().trim().max(100).optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
})

export const feedQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(20),
  before: z.string().datetime().optional(),
})

export const idSchema = z.object({ id: z.string().min(1).max(50) })