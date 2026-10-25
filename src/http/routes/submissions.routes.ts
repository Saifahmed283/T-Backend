import type { FastifyInstance } from 'fastify'
import { notifySubmissionCreated } from '../../modules/notifications/submission-notifications.js'
import { createSubmission, listSubmissions } from '../../modules/submissions/submissions.service.js'
import { requireAuth, requireRole } from '../middleware/requireAuth.js'
import { createSubmissionSchema, listSubmissionsSchema } from '../schemas/submission.schemas.js'

export async function registerSubmissionRoutes(app: FastifyInstance) {
  // Public: the marketing site has no session, so this is the one write endpoint
  // that is deliberately unauthenticated. It is covered by rate limits
  // and the Origin CSRF check.
  app.post(
    '/api/v1/submissions',
    {
      config: {
        rateLimit: {
          max: 60,
          timeWindow: '15 minutes',
        },
      },
    },
    async (request, reply) => {
      const body = createSubmissionSchema.parse(request.body)
      const created = await createSubmission(body)
      // Best-effort: notifications never turn a recorded submission into a 5xx.
      await notifySubmissionCreated(
        {
          ...created,
          email: body.email ?? null,
          name: body.name ?? null,
          message: body.message ?? null,
          source: body.source ?? null,
          payload: body.payload ?? null,
        },
        request.log,
      )
      return reply.status(201).send(created)
    },
  )

  // The inbox holds every tenant's inbound mail, so it is admin-only.
  app.get('/api/v1/submissions', { preHandler: [requireAuth, requireRole('admin')] }, async (request, reply) => {
    const query = listSubmissionsSchema.parse(request.query)
    return reply.send(await listSubmissions(query))
  })
}
