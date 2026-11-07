import { z } from 'zod'

export const submissionKinds = [
  'CONTACT',
  'EXPERT_REGISTRATION',
  'SEAT_RESERVATION',
  'TENDER_INTEREST',
  'TEAM_PROPOSAL',
  'JOB_APPLICATION',
  'PUBLICATION_REQUEST',
  'NEWSLETTER',
  'CONTRIBUTION',
  'MORPHE_LEAD',
] as const

export const submissionKindSchema = z.enum(submissionKinds, 'Choose a valid request type')

export type SubmissionKind = z.infer<typeof submissionKindSchema>

export const createSubmissionSchema = z
  .object({
    kind: submissionKindSchema,
    email: z.string().trim().toLowerCase().email('Enter a valid email address').max(254, 'Email is too long').optional(),
    name: z.string().trim().min(1, 'Name is required').max(160, 'Name must be 160 characters or fewer').optional(),
    message: z.string().trim().max(4000, 'Message must be 4,000 characters or fewer').optional(),
    source: z.string().trim().max(120).optional(),
    payload: z.record(z.string(), z.unknown()).optional(),
  })
  .strict()
  .superRefine((data, ctx) => {
    // CONTRIBUTION is the only anonymous kind; every other submission needs a
    // way to reply, so an email is mandatory for them.
    if (data.kind !== 'CONTRIBUTION' && !data.email) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['email'], message: 'An email address is required' })
    }

    // Bound the public-facing payload so a malicious client cannot exfiltrate
    // or inject unbounded data through the unauthenticated submission endpoint.
    if (data.payload) {
      const keys = Object.keys(data.payload)
      if (keys.length > 20) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['payload'],
          message: 'Payload must contain 20 keys or fewer',
        })
      }
      const serialized = JSON.stringify(data.payload)
      if (serialized.length > 5_000) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['payload'],
          message: 'Payload must be 5,000 characters or fewer when serialized',
        })
      }
    }
  })

export const listSubmissionsSchema = z.object({
  kind: submissionKindSchema.optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
})
