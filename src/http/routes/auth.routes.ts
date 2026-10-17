import type { FastifyInstance } from 'fastify'
import { config } from '../../config/config.js'
import { changePassword, destroySession, loginWithPassword } from '../../modules/auth/auth.service.js'
import { SESSION_COOKIE, clearSessionCookie, setSessionCookie } from '../helpers/session-cookie.js'
import { principalOf, requireAuth } from '../middleware/requireAuth.js'
import { changePasswordSchema, loginSchema } from '../schemas/auth.schemas.js'

export async function registerAuthRoutes(app: FastifyInstance) {
  // A tight, login-specific ceiling on top of the global limiter so credential
  // stuffing from a single IP cannot consume the shared bucket.
  app.post('/api/v1/auth/login', { config: { rateLimit: { max: config.LOGIN_RATE_LIMIT_MAX, timeWindow: '15 minutes' } } }, async (request, reply) => {
    const { email, password } = loginSchema.parse(request.body)
    const principal = await loginWithPassword(email, password)
    setSessionCookie(reply, principal.token, principal.expiresAt)
    return reply.send({
      user: principal.user,
      workspace: principal.workspace,
      role: principal.role,
      expiresAt: principal.expiresAt.toISOString(),
    })
  })

  app.post('/api/v1/auth/logout', async (request, reply) => {
    const token = request.cookies[SESSION_COOKIE]
    if (token) await destroySession(token)
    clearSessionCookie(reply)
    return reply.status(204).send()
  })

  app.get('/api/v1/auth/me', { preHandler: requireAuth }, async (request, reply) => {
    const principal = principalOf(request)
    return reply.send({
      user: { id: principal.userId, name: principal.name, email: principal.email },
      workspace: { id: principal.workspaceId, slug: principal.workspaceSlug },
      role: principal.role,
    })
  })

  app.post('/api/v1/auth/password', { preHandler: requireAuth }, async (request, reply) => {
    const principal = principalOf(request)
    const body = changePasswordSchema.parse(request.body)
    await changePassword(principal.userId, body.currentPassword, body.newPassword)
    clearSessionCookie(reply)
    return reply.status(204).send()
  })
}