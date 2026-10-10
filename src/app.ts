
import Fastify from 'fastify'
import rateLimit from '@fastify/rate-limit'
import cookie from '@fastify/cookie'
import cors from '@fastify/cors'
import sensible from '@fastify/sensible'
import { config } from './config.js'
import { registerErrorHandler } from './errors.js'
import { registerRoutes } from './routes.js'

export async function buildApp() {
  const app = Fastify({ logger: config.NODE_ENV !== 'test' })
  await app.register(cors, {
    origin: config.FRONTEND_ORIGIN,
    // Session cookies are only sent when requests opt in explicitly.
    credentials: true,
  })
  await app.register(cookie, { secret: config.SESSION_SECRET })
  // This API speaks JSON only. Tolerate requests that carry no content type or
  // an empty body, so bodyless endpoints such as logout work whether or not the
  // caller sets a content type or sends '{}'.
  const parseJsonBody = (_req: unknown, body: unknown, done: (err: Error | null, value?: unknown) => void) => {
    const raw = typeof body === 'string' ? body.trim() : ''
    if (raw === '') return done(null, {})
    try {
      done(null, JSON.parse(raw))
    } catch (error) {
      done(error as Error, undefined)
    }
  }
  app.addContentTypeParser('application/json', { parseAs: 'string' }, parseJsonBody)
  app.addContentTypeParser('*', { parseAs: 'string' }, parseJsonBody)
  await app.register(sensible)
  // Rate limiting: 100 requests per 15 minutes per IP
await app.register(rateLimit, {
    max: 100,
    timeWindow: '15 minutes',
    // Health checks are excluded from rate limiting on the route itself.
    // @fastify/rate-limit v11 has no top-level 'skip' option.
  })
  registerErrorHandler(app)
  await app.register(async (api) => registerRoutes(api))
  return app
}

