import { z } from 'zod'

export const assignmentStatusSchema = z.enum(['ON_TRACK', 'AT_RISK', 'BLOCKED'])

export const expertStatusSchema = z.enum([
  'REGISTERED',
  'PROFILE_COMPLETE',
  'VETTED',
  'MATCHED',
  'DEPLOYED',
  'REJECTED',
])

export const listQuerySchema = z.object({
  status: assignmentStatusSchema.optional(),
  search: z.string().trim().max(100).optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
})

export const expertListQuerySchema = z.object({
  status: expertStatusSchema.optional(),
  search: z.string().trim().max(100).optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
})

export const feedQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(20),
  before: z.string().datetime().optional(),
})

export const idSchema = z.object({ id: z.string().min(1).max(50) })
