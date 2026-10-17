import type { FastifyInstance } from 'fastify'
import { listExperts } from '../../modules/experts/experts.service.js'
import { principalOf, requireAuth } from '../middleware/requireAuth.js'
import { expertListQuerySchema } from '../schemas/common.schemas.js'

export async function registerExpertRoutes(app: FastifyInstance) {
  app.get('/api/v1/experts', { preHandler: requireAuth }, async (request, reply) => {
    const query = expertListQuerySchema.parse(request.query)
    const { workspaceId } = principalOf(request)
    return reply.send(await listExperts({ ...query, workspaceId }))
  })
}
