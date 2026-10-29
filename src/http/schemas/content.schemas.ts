import { z } from 'zod'
import { ALL_STATUSES } from '../../modules/content/content.service.js'

export const contentStatusSchema = z.enum(ALL_STATUSES)

export const contentListQuerySchema = z.object({
  status: contentStatusSchema.optional(),
  search: z.string().trim().max(100).optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
})

const localizedRecord = z.record(z.string(), z.unknown())

const boundLocalizedRecord = (label: string) =>
  localizedRecord.superRefine((value, ctx) => {
    const serialized = JSON.stringify(value)
    if (serialized.length > 50_000) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: [label],
        message: `${label} must be 50,000 characters or fewer when serialized`,
      })
    }
  })

export const createContentSchema = z
  .object({
    data: boundLocalizedRecord('data').default({}),
    seo: boundLocalizedRecord('seo').optional(),
    slug: z.string().trim().max(120).optional(),
    assignmentId: z.string().trim().max(50).nullable().optional(),
    sourceReference: z.string().trim().max(300).nullable().optional(),
    scheduledPublishAt: z.string().datetime().nullable().optional(),
    scheduledUnpublishAt: z.string().datetime().nullable().optional(),
  })
  .strict()

export const updateContentSchema = z
  .object({
    data: boundLocalizedRecord('data').optional(),
    seo: boundLocalizedRecord('seo').nullable().optional(),
    slug: z.string().trim().max(120).optional(),
    assignmentId: z.string().trim().max(50).nullable().optional(),
    sourceReference: z.string().trim().max(300).nullable().optional(),
    scheduledPublishAt: z.string().datetime().nullable().optional(),
    scheduledUnpublishAt: z.string().datetime().nullable().optional(),
  })
  .strict()

export const transitionSchema = z.object({ to: contentStatusSchema }).strict()
