import type { FastifyInstance } from 'fastify'
import { getDashboardSummary } from '../../modules/dashboard/dashboard.service.js'
import { principalOf, requireAuth } from '../middleware/requireAuth.js'

export async function registerDashboardRoutes(app: FastifyInstance) {
  app.get('/api/v1/dashboard/summary', { preHandler: requireAuth }, async (request, reply) => {
    const { workspaceId } = principalOf(request)
    return reply.send(await getDashboardSummary(workspaceId))
  })
}