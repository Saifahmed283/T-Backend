import Fastify from 'fastify'
import compress from '@fastify/compress'
import rateLimit from '@fastify/rate-limit'
import cookie from '@fastify/cookie'
import cors from '@fastify/cors'
import helmet from '@fastify/helmet'
import multipart from '@fastify/multipart'
import { config } from './config/config.js'
import { HttpError, registerErrorHandler } from './http/errors.js'
import { registerCsrfProtection } from './http/middleware/csrf.js'
import { registerRoutes } from './http/routes/index.js'
import { configureJobQueue } from './lib/job-queue.js'

export async function buildApp() {
  const app = Fastify({
    logger: config.NODE_ENV !== 'test',
    // Behind Hostinger's reverse proxy the real client IP arrives in
    // X-Forwarded-For; without this every caller shares one rate-limit bucket.
    trustProxy: config.TRUST_PROXY,
  })

  await app.register(helmet, {
    // The API serves JSON, not HTML. CSP is configured to allow only
    // same-origin resources and disallow inline scripts/styles.
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'none'"],
        scriptSrc: ["'none'"],
        styleSrc: ["'none'"],
        imgSrc: ["'none'"],
        connectSrc: ["'self'"],
        fontSrc: ["'none'"],
        objectSrc: ["'none'"],
        mediaSrc: ["'none'"],
        frameSrc: ["'none'"],
        baseUri: ["'none'"],
        formAction: ["'none'"],
      },
    },
    crossOriginResourcePolicy: { policy: 'same-origin' },
    crossOriginEmbedderPolicy: { policy: 'require-corp' },
    crossOriginOpenerPolicy: { policy: 'same-origin' },
    frameguard: { action: 'deny' },
    noSniff: true,
    referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
    hidePoweredBy: true,
    xssFilter: true,
  })

  // Compress JSON responses. The public content payloads are the big ones;
  // small bodies stay uncompressed because the framing would cost more than it
  // saves. Brotli is preferred, gzip is the fallback.
  await app.register(compress, {
    global: true,
    encodings: ['br', 'gzip'],
    threshold: 1_024,
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

  // Slow-request signal without a tracing backend. The log line carries enough
  // context to find the route; an OTel collector can be added later without
  // changing this hook.
  app.addHook('onResponse', async (request, reply) => {
    const durationMs = Math.round(reply.elapsedTime)
    if (durationMs < config.SLOW_REQUEST_MS) return
    request.log.warn(
      {
        event: 'http.slow_request',
        method: request.method,
        url: request.url,
        statusCode: reply.statusCode,
        durationMs,
      },
      'slow request',
    )
  })

  // Background jobs report through the same structured logger as requests.
  configureJobQueue({ logger: app.log })

  registerErrorHandler(app)
  registerCsrfProtection(app)
  await app.register(async (api) => registerRoutes(api))
  return app
}
