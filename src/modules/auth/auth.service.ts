import { createHmac, randomBytes, randomUUID } from 'node:crypto'
import { config } from '../../config/config.js'
import { prisma } from '../../db/prisma.js'
import { AppError } from '../errors.js'
import { hashPassword, verifyPassword } from '../../security/passwords.js'
import type { Principal } from './types.js'

// Session tokens.
//
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

// How often an active session's lastUsedAt is persisted. Writing on every
// request would be wasteful; a minute is fine-grained enough for idle timeout.
const IDLE_TOUCH_MS = 60_000

export async function resolveSession(token: string): Promise<Principal | null> {
  const session = await prisma.session.findUnique({
    where: { tokenHash: tokenDigest(token) },
    include: { user: { include: { memberships: { include: { workspace: true } } } } },
  })
  if (!session) return null

  const now = Date.now()
  const idleMs = now - session.lastUsedAt.getTime()
  if (session.expiresAt.getTime() <= now || idleMs > config.SESSION_IDLE_MS) {
    await prisma.session.delete({ where: { id: session.id } }).catch(() => {})
    return null
  }
  // Slide the idle window forward, at most once a minute. Best-effort: a role
  // without UPDATE on this column simply keeps the absolute-expiry behaviour.
  if (idleMs > IDLE_TOUCH_MS) {
    await prisma.session.update({ where: { id: session.id }, data: { lastUsedAt: new Date() } }).catch(() => {})
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

export type AuthenticatedPrincipal = {
  user: { id: string; name: string; email: string }
  workspace: { id: string; name: string; slug: string }
  role: string
  token: string
  expiresAt: Date
}

// Kept for constant-time misses: verifying against a real hash makes an unknown
// email take as long as a wrong password, closing the timing side channel.
let dummyHash: string | null = null
async function absorbPasswordWork(password: string): Promise<void> {
  if (!dummyHash) dummyHash = await hashPassword(randomBytes(16).toString('hex'))
  await verifyPassword(password, dummyHash)
}

export async function loginWithPassword(email: string, password: string): Promise<AuthenticatedPrincipal> {
  const user = await prisma.user.findUnique({
    where: { email: email.toLowerCase() },
    include: { memberships: { include: { workspace: true }, orderBy: { workspaceId: 'asc' } } },
  })

  // Identical failure for unknown email and wrong password so the response
  // cannot be used to enumerate registered accounts.
  const invalid = new AppError(401, 'Email or password is incorrect', 'INVALID_CREDENTIALS')
  if (!user?.passwordHash) {
    await absorbPasswordWork(password)
    throw invalid
  }
  if (!(await verifyPassword(password, user.passwordHash))) throw invalid

  const membership = user.memberships[0]
  if (!membership) throw new AppError(403, 'Your account has no workspace access', 'NO_WORKSPACE')

  const { token, expiresAt } = await createSession(user.id, membership.workspaceId)

  return {
    user: { id: user.id, name: user.name, email: user.email },
    workspace: { id: membership.workspaceId, name: membership.workspace.name, slug: membership.workspace.slug },
    role: membership.role,
    token,
    expiresAt,
  }
}

export async function changePassword(userId: string, currentPassword: string, newPassword: string): Promise<void> {
  const user = await prisma.user.findUnique({ where: { id: userId } })
  if (!user?.passwordHash) throw new AppError(400, 'This account has no password set', 'NO_PASSWORD')
  if (!(await verifyPassword(currentPassword, user.passwordHash))) {
    throw new AppError(403, 'Current password is incorrect', 'INVALID_CREDENTIALS')
  }
  await prisma.user.update({ where: { id: user.id }, data: { passwordHash: await hashPassword(newPassword) } })
  // Force other devices to sign in again.
  await prisma.session.deleteMany({ where: { userId: user.id } })
}