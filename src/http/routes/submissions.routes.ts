import type { FastifyInstance } from 'fastify'
import { createSubmission, listSubmissions } from '../../modules/submissions/submissions.service.js'
import { requireAuth } from '../middleware/requireAuth.js'
import { createSubmissionSchema, listSubmissionsSchema } from '../schemas/submission.schemas.js'

export async function registerSubmissionRoutes(app: FastifyInstance) {
  // Public: the marketing site has no session, so this is the one write endpoint
  // that is deliberately unauthenticated. It is covered by the global rate limit.
  app.post('/api/v1/submissions', async (request, reply) => {
    const body = createSubmissionSchema.parse(request.body)
    return reply.status(201).send(await createSubmission(body))
  })

  app.get('/api/v1/submissions', { preHandler: requireAuth }, async (request, reply) => {
    const query = listSubmissionsSchema.parse(request.query)
    return reply.send(await listSubmissions(query))
  })
}
