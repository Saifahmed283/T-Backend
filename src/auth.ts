import { createHmac, randomBytes, randomUUID } from 'node:crypto'
import type { FastifyReply, FastifyRequest } from 'fastify'
import { config } from './config.js'
import { prisma } from './prisma.js'
import { AppError } from './errors.js'

export { hashPassword, verifyPassword } from './passwords.js'

export const SESSION_COOKIE = 'tm_session'

export type Principal = {
  userId: string
  email: string
  name: string
  workspaceId: string
  workspaceSlug: string
  role: string
}

/* ---------- session tokens ---------- */

// The cookie carries a raw random token. Only an HMAC of it is stored, so a
// database leak alone does not yield usable session cookies.
function tokenDigest(token: string): string {
  return createHmac('sha256', config.SESSION_SECRET).update(token).digest('hex')
}

export async function createSession(userId: string, workspaceId: string): Promise<{ token: string; expiresAt: Date }> {
  const token = randomBytes(32).toString('base64url')
  const expiresAt = new Date(Date.now() + config.SESSION_TTL_MS)
  await prisma.session.create({ data: { id: randomUUID(), tokenHash: tokenDigest(token), userId, activeWorkspaceId: workspaceId, expiresAt } })
  return { token, expiresAt }
}

export async function destroySession(token: string): Promise<void> {
  await prisma.session.deleteMany({ where: { tokenHash: tokenDigest(token) } })
}

export async function resolveSession(token: string): Promise<Principal | null> {
  const session = await prisma.session.findUnique({
    where: { tokenHash: tokenDigest(token) },
    include: { user: { include: { memberships: { include: { workspace: true } } } } },
  })
  if (!session) return null
  if (session.expiresAt.getTime() <= Date.now()) {
    await prisma.session.delete({ where: { id: session.id } }).catch(() => {})
    return null
  }
  // The workspace is re-read on every request so a revoked membership or a
  // deleted workspace takes effect immediately rather than at session expiry.
  const membership = session.user.memberships.find((m) => m.workspaceId === session.activeWorkspaceId)
  if (!membership) return null

  return {
    userId: session.user.id,
    email: session.user.email,
    name: session.user.name,
    workspaceId: membership.workspaceId,
    workspaceSlug: membership.workspace.slug,
    role: membership.role,
  }
}

export function setSessionCookie(reply: FastifyReply, token: string, expiresAt: Date): void {
  reply.setCookie(SESSION_COOKIE, token, {
    path: '/',
    httpOnly: true,
    sameSite: 'lax',
    secure: config.NODE_ENV === 'production',
    expires: expiresAt,
  })
}

export function clearSessionCookie(reply: FastifyReply): void {
  reply.clearCookie(SESSION_COOKIE, { path: '/' })
}

/* ---------- route guard ---------- */

declare module 'fastify' {
  interface FastifyRequest {
    principal?: Principal
  }
}

export async function requireAuth(request: FastifyRequest): Promise<void> {
  const token = request.cookies[SESSION_COOKIE]
  if (!token) throw new AppError(401, 'Authentication required', 'UNAUTHENTICATED')
  const principal = await resolveSession(token)
  if (!principal) throw new AppError(401, 'Session is invalid or has expired', 'UNAUTHENTICATED')
  request.principal = principal
}

/** Narrows the optional `principal` for handlers that run behind `requireAuth`. */
export function principalOf(request: FastifyRequest): Principal {
  if (!request.principal) throw new AppError(401, 'Authentication required', 'UNAUTHENTICATED')
  return request.principal
}