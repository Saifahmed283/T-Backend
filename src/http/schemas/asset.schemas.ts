import { z } from 'zod'

export const assetListQuerySchema = z.object({
  search: z.string().trim().max(100).optional(),
  mimeType: z.string().trim().max(100).optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(40),
})

export const altBodySchema = z
  .object({
    alt: z
      .object({ en: z.string().trim().max(300).optional(), ar: z.string().trim().max(300).optional() })
      .nullable(),
  })
  .strict()
