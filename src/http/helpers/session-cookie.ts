import type { FastifyReply } from 'fastify'
import { config } from '../../config/config.js'

export const SESSION_COOKIE = 'tm_session'

// The frontend (askterramorph.com) and API (…hostingersite.com) are separate
// sites, so the session cookie must be SameSite=None; Secure to travel on
// cross-site requests. SameSite=None is only valid with Secure, hence the
// production-only 'none' default. CSRF is handled by the Origin check in
// http/middleware/csrf.ts, which SameSite=None no longer provides.
export function setSessionCookie(reply: FastifyReply, token: string, expiresAt: Date): void {
  reply.setCookie(SESSION_COOKIE, token, {
    path: '/',
    httpOnly: true,
    sameSite: config.COOKIE_SAMESITE,
    secure: config.isProduction,
    expires: expiresAt,
  })
}

export function clearSessionCookie(reply: FastifyReply): void {
  reply.clearCookie(SESSION_COOKIE, {
    path: '/',
    httpOnly: true,
    sameSite: config.COOKIE_SAMESITE,
    secure: config.isProduction,
  })
}
