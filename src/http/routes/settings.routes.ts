import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { getSiteSettings, updateSiteSettings } from '../../modules/settings/settings.service.js'
import { principalOf, requireAuth, requireRole } from '../middleware/requireAuth.js'

const siteSettingsBodySchema = z.object({ data: z.record(z.unknown()) }).strict()

export async function registerSettingsRoutes(app: FastifyInstance) {
  app.get('/api/v1/settings/site', { preHandler: requireAuth }, async (request, reply) => {
    const { workspaceId } = principalOf(request)
    return reply.send(await getSiteSettings(workspaceId))
  })

  app.put('/api/v1/settings/site', { preHandler: [requireAuth, requireRole('admin', 'lead')] }, async (request, reply) => {
    const { data } = siteSettingsBodySchema.parse(request.body)
    const principal = principalOf(request)
    return reply.send(await updateSiteSettings(principal.workspaceId, data, principal.userId))
  })
}
