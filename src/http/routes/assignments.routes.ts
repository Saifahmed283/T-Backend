import type { FastifyInstance } from 'fastify'
import { getAssignment, listAssignments } from '../../modules/assignments/assignments.service.js'
import { principalOf, requireAuth } from '../middleware/requireAuth.js'
import { idSchema, listQuerySchema } from '../schemas/common.schemas.js'

export async function registerAssignmentRoutes(app: FastifyInstance) {
  app.get('/api/v1/assignments', { preHandler: requireAuth }, async (request, reply) => {
    const query = listQuerySchema.parse(request.query)
    const { workspaceId } = principalOf(request)
    return reply.send(await listAssignments({ ...query, workspaceId }))
  })

  app.get('/api/v1/assignments/:id', { preHandler: requireAuth }, async (request, reply) => {
    const { id } = idSchema.parse(request.params)
    const { workspaceId } = principalOf(request)
    return reply.send(await getAssignment(workspaceId, id))
  })
}