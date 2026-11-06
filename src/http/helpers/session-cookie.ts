import type { FastifyReply } from 'fastify'
import { config } from '../../config/config.js'

// The __Host- prefix is a browser-enforced guarantee (Secure, Path=/, no
// Domain) and is only valid on a Secure cookie. Production serves the API over
// https, so it gets the hardened name. Local development runs over plain http,
// where browsers reject a __Host- cookie without Secure — the session would be
// silently dropped and every sign-in would appear to succeed then bounce back
// to the login page. Use the unprefixed name whenever the cookie is not Secure.
export const SESSION_COOKIE = config.isProduction ? '__Host-tm_session' : 'tm_session'

// The frontend (askterramorph.com) and API (…hostingersite.com) are separate
// sites, so the session cookie must be SameSite=None; Secure to travel on
// cross-site requests. SameSite=None is only valid with Secure, hence the
// production-only 'none' default. CSRF is handled by the Origin check in
// http/middleware/csrf.ts, which SameSite=None no longer provides.
// The __Host- prefix requires Secure, Path=/, and no Domain attribute.
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
