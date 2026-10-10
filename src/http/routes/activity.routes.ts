import type { FastifyInstance } from 'fastify'
import { getActivities } from '../../modules/activity/activity.service.js'
import { principalOf, requireAuth } from '../middleware/requireAuth.js'
import { feedQuerySchema } from '../schemas/common.schemas.js'

export async function registerActivityRoutes(app: FastifyInstance) {
  app.get('/api/v1/activity', { preHandler: requireAuth }, async (request, reply) => {
    const { limit, before } = feedQuerySchema.parse(request.query)
    const { workspaceId } = principalOf(request)
    return reply.send(await getActivities(workspaceId, limit, before))
  })
}