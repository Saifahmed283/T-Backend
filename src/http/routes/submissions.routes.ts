import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { enqueueJob } from '../../lib/job-queue.js'
import { notifySubmissionCreated } from '../../modules/notifications/submission-notifications.js'
import {
  createSubmission,
  listSubmissions,
  getSubmission,
  updateSubmissionStatus,
  deleteSubmission,
  countSubmissionsByStatus,
} from '../../modules/submissions/submissions.service.js'
import { requireAuth, requireRole } from '../middleware/requireAuth.js'
import { createSubmissionSchema, listSubmissionsSchema } from '../schemas/submission.schemas.js'

const submissionParamsSchema = z.object({ id: z.string().min(1).max(50) })
const updateStatusSchema = z.object({ status: z.enum(['NEW', 'IN_REVIEW', 'APPROVED', 'REJECTED', 'ARCHIVED']) }).strict()

export async function registerSubmissionRoutes(app: FastifyInstance) {
  // Public: the marketing site has no session, so this is the one write endpoint
  // that is deliberately unauthenticated. It is covered by rate limits
  // and the Origin CSRF check.
  app.post(
    '/api/v1/submissions',
    {
      config: {
        rateLimit: {
          max: 20,
          timeWindow: '15 minutes',
        },
      },
    },
    async (request, reply) => {
      const body = createSubmissionSchema.parse(request.body)
      const created = await createSubmission(body)
      await enqueueJob('submission.notifications', () =>
        notifySubmissionCreated(
          {
            ...created,
            email: body.email ?? null,
            name: body.name ?? null,
            message: body.message ?? null,
            source: body.source ?? null,
            payload: body.payload ?? null,
            locale: body.locale,
          },
          request.log,
        ),
      )
      return reply.status(201).send(created)
    },
  )

  // The inbox holds every tenant's inbound mail, so it is admin-only.
  app.get('/api/v1/submissions', { preHandler: [requireAuth, requireRole('admin')] }, async (request, reply) => {
    const query = listSubmissionsSchema.parse(request.query)
    return reply.send(await listSubmissions(query))
  })

  app.get('/api/v1/submissions/stats', { preHandler: [requireAuth, requireRole('admin')] }, async (_request, reply) => {
    return reply.send(await countSubmissionsByStatus())
  })

  app.get('/api/v1/submissions/:id', { preHandler: [requireAuth, requireRole('admin')] }, async (request, reply) => {
    const { id } = submissionParamsSchema.parse(request.params)
    const item = await getSubmission(id)
    if (!item) return reply.status(404).send({ error: { code: 'SUBMISSION_NOT_FOUND', message: 'Submission not found' } })
    return reply.send(item)
  })

  app.patch('/api/v1/submissions/:id/status', { preHandler: [requireAuth, requireRole('admin')] }, async (request, reply) => {
    const { id } = submissionParamsSchema.parse(request.params)
    const { status } = updateStatusSchema.parse(request.body)
    const item = await updateSubmissionStatus({ id, status })
    return reply.send(item)
  })

  app.delete('/api/v1/submissions/:id', { preHandler: [requireAuth, requireRole('admin')] }, async (request, reply) => {
    const { id } = submissionParamsSchema.parse(request.params)
    await deleteSubmission(id)
    return reply.send({ deleted: true })
  })
}