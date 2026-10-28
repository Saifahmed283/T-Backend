import type { FastifyInstance } from 'fastify'
import { config } from '../../config/config.js'
import { AppError } from '../../modules/errors.js'

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS'])

/**
 * CSRF defence for a cross-site cookie API.
 *
 * Cookies are SameSite=None (the site and API are on different origins), so the
 * browser would happily attach the session cookie to a request triggered by any
 * other website. We therefore require that every state-changing request carries
 * an Origin (or Referer) that matches one of the configured frontend origins.
 *
 * Non-browser clients (server-to-server, curl, tests) send neither header and
 * are allowed through: they cannot be tricked into carrying a victim's cookie.
 */
export function registerCsrfProtection(app: FastifyInstance): void {
  app.addHook('onRequest', async (request) => {
    if (SAFE_METHODS.has(request.method)) return

    const origin = request.headers.origin
    const referer = request.headers.referer
    if (!origin && !referer) return

    let source = origin
    if (!source && referer) {
      try {
        source = new URL(referer).origin
      } catch {
        source = undefined
      }
    }

    if (!source || !config.CORS_ORIGINS.includes(source)) {
      // Allow public chat endpoint to be called from allowed origins even if CSRF blocks
      if (request.url.startsWith('/api/v1/public/chat')) {
        return
      }
      throw new AppError(403, 'Cross-site request blocked', 'CSRF_BLOCKED')
    }
  })
}
