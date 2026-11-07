import type { FastifyInstance } from 'fastify'
import { prisma } from '../../db/prisma.js'
import { registerActivityRoutes } from './activity.routes.js'
import { registerAssetRoutes } from './assets.routes.js'
import { registerAuthRoutes } from './auth.routes.js'
import { registerContentRoutes } from './content.routes.js'
import { registerDataRequestRoutes } from './data-requests.routes.js'
import { registerMarketingConsentRoutes } from './marketing-consent.routes.js'
import { registerMemberRoutes } from './members.routes.js'
import { registerPublicRoutes } from './public.routes.js'
import { registerSettingsRoutes } from './settings.routes.js'
import { registerSubmissionRoutes } from './submissions.routes.js'

export async function registerRoutes(app: FastifyInstance) {
  // Liveness: is the process up? Never touches the database.
  app.get(
    '/health',
    { config: { rateLimit: { max: 60, timeWindow: '15 minutes' } } },
    async () => ({ status: 'ok', service: 'terramorph-api', timestamp: new Date().toISOString() }),
  )

  // Readiness: can the process actually serve traffic (database reachable)?
  app.get('/health/ready', { config: { rateLimit: { max: 30, timeWindow: '15 minutes' } } }, async (_request, reply) => {
    try {
      await prisma.$queryRaw`SELECT 1`
      return reply.send({ status: 'ready', database: 'up', timestamp: new Date().toISOString() })
    } catch {
      return reply.status(503).send({ status: 'unavailable', database: 'down', timestamp: new Date().toISOString() })
    }
  })

  await registerAuthRoutes(app)
  await registerActivityRoutes(app)
  await registerSubmissionRoutes(app)
  await registerContentRoutes(app)
  await registerPublicRoutes(app)
  await registerAssetRoutes(app)
  await registerSettingsRoutes(app)
  await registerMemberRoutes(app)
  await registerDataRequestRoutes(app)
  await registerMarketingConsentRoutes(app)
}