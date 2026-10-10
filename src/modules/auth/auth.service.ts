import { createHmac, randomBytes, randomUUID } from 'node:crypto'
import { config } from '../../config/config.js'
import { prisma } from '../../db/prisma.js'
import type { Principal } from './types.js'

export { hashPassword, verifyPassword } from '../../security/passwords.js'

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