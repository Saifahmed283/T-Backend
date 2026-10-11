import type { FastifyInstance } from 'fastify'
import { registerActivityRoutes } from './activity.routes.js'
import { registerAssignmentRoutes } from './assignments.routes.js'
import { registerAuthRoutes } from './auth.routes.js'
import { registerDashboardRoutes } from './dashboard.routes.js'
import { registerExpertRoutes } from './experts.routes.js'
import { registerSubmissionRoutes } from './submissions.routes.js'

export async function registerRoutes(app: FastifyInstance) {
  app.get(
    '/health',
    { config: { rateLimit: false } },
    async () => ({ status: 'ok', service: 'terramorph-api', timestamp: new Date().toISOString() }),
  )

  await registerAuthRoutes(app)
  await registerDashboardRoutes(app)
  await registerAssignmentRoutes(app)
  await registerExpertRoutes(app)
  await registerActivityRoutes(app)
  await registerSubmissionRoutes(app)
}