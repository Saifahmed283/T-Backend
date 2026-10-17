import Fastify from 'fastify'
import rateLimit from '@fastify/rate-limit'
import cookie from '@fastify/cookie'
import cors from '@fastify/cors'
import helmet from '@fastify/helmet'
import multipart from '@fastify/multipart'
import { config } from './config/config.js'
import { HttpError, registerErrorHandler } from './http/errors.js'
import { registerCsrfProtection } from './http/middleware/csrf.js'
import { registerRoutes } from './http/routes/index.js'

export async function buildApp() {
  const app = Fastify({
    logger: config.NODE_ENV !== 'test',
    // Behind Hostinger's reverse proxy the real client IP arrives in
    // X-Forwarded-For; without this every caller shares one rate-limit bucket.
    trustProxy: config.TRUST_PROXY,
  })

  await app.register(helmet, {
    // The API serves JSON, not HTML, so a CSP adds nothing. Resource policy is
    // opened up so the browser may read responses from the site's origin.
    contentSecurityPolicy: false,
    crossOriginResourcePolicy: { policy: 'cross-origin' },
    crossOriginEmbedderPolicy: false,
  })

  await app.register(cors, {
    origin: config.CORS_ORIGINS,
    // Session cookies are only sent when requests opt in explicitly.
    credentials: true,
  })
  await app.register(cookie, { secret: config.SESSION_SECRET })

  // Media uploads. The specific multipart parser takes precedence over the
  // catch-all JSON parser below; oversized files are rejected inside the route.
  await app.register(multipart, {
    limits: { fileSize: 15 * 1024 * 1024, files: 5, fields: 20 },
    throwFileSizeLimit: true,
  })

  // This API speaks JSON only. Tolerate requests that carry no content type or
  // an empty body, so bodyless endpoints such as logout work whether or not the
  // caller sets a content type or sends '{}'.
  const parseJsonBody = (_req: unknown, body: unknown, done: (err: Error | null, value?: unknown) => void) => {
    const raw = typeof body === 'string' ? body.trim() : ''
    if (raw === '') return done(null, {})
    try {
      done(null, JSON.parse(raw))
    } catch {
      // Malformed JSON is a client error, not a server fault.
      done(new HttpError(400, 'Request body is not valid JSON', 'INVALID_JSON'), undefined)
    }
  }
  app.addContentTypeParser('application/json', { parseAs: 'string' }, parseJsonBody)
  app.addContentTypeParser('*', { parseAs: 'string' }, parseJsonBody)

  // Rate limiting: 100 requests per 15 minutes per IP (health excluded on the
  // route itself). Login and other sensitive routes set a stricter per-route
  // ceiling. The plugin *throws* whatever errorResponseBuilder returns, so it
  // must be an Error carrying a status — then the shared error handler renders
  // it in the standard { error: { code, message } } envelope.
  await app.register(rateLimit, {
    max: config.RATE_LIMIT_MAX,
    timeWindow: '15 minutes',
    errorResponseBuilder: (_request, context) => {
      const error = new Error(`Too many requests. Try again in ${context.ttl ? Math.ceil(context.ttl / 1000) : 900} seconds.`)
      Object.assign(error, { statusCode: 429, code: 'RATE_LIMITED' })
      return error
    },
  })

  registerErrorHandler(app)
  registerCsrfProtection(app)
  await app.register(async (api) => registerRoutes(api))
  return app
}
