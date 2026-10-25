import { z } from 'zod'
import { ALL_STATUSES } from '../../modules/content/content.service.js'

export const contentStatusSchema = z.enum(ALL_STATUSES)

export const contentListQuerySchema = z.object({
  status: contentStatusSchema.optional(),
  search: z.string().trim().max(100).optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
})

const localizedRecord = z.record(z.unknown())

export const createContentSchema = z
  .object({
    data: localizedRecord.default({}),
    seo: localizedRecord.optional(),
    slug: z.string().trim().max(120).optional(),
    assignmentId: z.string().trim().max(50).nullable().optional(),
    sourceReference: z.string().trim().max(300).nullable().optional(),
    scheduledPublishAt: z.string().datetime().nullable().optional(),
    scheduledUnpublishAt: z.string().datetime().nullable().optional(),
  })
  .strict()

export const updateContentSchema = z
  .object({
    data: localizedRecord.optional(),
    seo: localizedRecord.nullable().optional(),
    slug: z.string().trim().max(120).optional(),
    assignmentId: z.string().trim().max(50).nullable().optional(),
    sourceReference: z.string().trim().max(300).nullable().optional(),
    scheduledPublishAt: z.string().datetime().nullable().optional(),
    scheduledUnpublishAt: z.string().datetime().nullable().optional(),
  })
  .strict()

export const transitionSchema = z.object({ to: contentStatusSchema }).strict()
