import { createHmac, randomBytes } from 'node:crypto'
import { config } from '../../config/config.js'
import { prisma } from '../../db/prisma.js'
import { hashPassword } from '../../security/passwords.js'
import type { EmailLogger } from '../email/email.service.js'
import { sendEmail } from '../email/email.service.js'
import { AppError } from '../errors.js'

// Password-reset tokens mirror session tokens: the link carries a random value,
// the database stores only its HMAC digest. A leaked table cannot be used to
// take over an account.
function tokenDigest(token: string): string {
  return createHmac('sha256', config.SESSION_SECRET).update(`password-reset:${token}`).digest('hex')
}

function resetLink(token: string): string {
  const origin = config.CORS_ORIGINS[0] ?? config.FRONTEND_ORIGIN
  return `${origin.replace(/\/+$/, '')}/reset-password?token=${encodeURIComponent(token)}`
}

/**
 * Issue a single-use reset link.
 *
 * The caller always returns the same response, whether or not the address is
 * registered, so this endpoint cannot be used to enumerate accounts.
 */
export async function requestPasswordReset(email: string, logger?: EmailLogger): Promise<void> {
  // Without a delivery channel a stored token would be unusable (and would
  // linger until expiry). The endpoint still answers 202 with the same shape.
  if (!config.EMAIL_ENABLED) {
    logger?.info({ event: 'auth.password_reset.skipped', reason: 'email_disabled' }, 'password reset skipped: email disabled')
    return
  }

  const user = await prisma.user.findUnique({
    where: { email: email.toLowerCase() },
    select: { id: true, email: true, name: true, passwordHash: true },
  })

  // Unknown addresses and passwordless accounts take the same silent path.
  if (!user?.passwordHash) return

  const token = randomBytes(32).toString('base64url')
  const now = new Date()
  const expiresAt = new Date(now.getTime() + config.PASSWORD_RESET_TTL_MS)

  await prisma.$transaction([
    // One live link per account: requesting another invalidates the previous.
    prisma.passwordResetToken.deleteMany({ where: { userId: user.id } }),
    prisma.passwordResetToken.create({
      data: { tokenHash: tokenDigest(token), userId: user.id, expiresAt },
    }),
  ])

  await sendEmail(
    {
      to: user.email,
      subject: 'Reset your TerraMorph password',
      text: [
        `Hello ${user.name},`,
        '',
        `Use the link below to choose a new password. It expires in ${Math.round(config.PASSWORD_RESET_TTL_MS / 60_000)} minutes and can be used once.`,
        '',
        resetLink(token),
        '',
        'If you did not request this, you can ignore this email; your password has not changed.',
        '',
        'TerraMorph Advisory LLC',
      ].join('\n'),
      kind: 'auth.password_reset',
    },
    logger,
  )

  logger?.info({ event: 'auth.password_reset.requested', userId: user.id }, 'password reset link issued')
}

/**
 * Consume a reset token, replace the password and invalidate every session.
 *
 * The conditional delete makes the token single-use even if two requests race:
 * only the request that removes the row may update the password.
 */
export async function resetPassword(token: string, newPassword: string, logger?: EmailLogger): Promise<void> {
  const tokenHash = tokenDigest(token)
  const row = await prisma.passwordResetToken.findUnique({
    where: { tokenHash },
    select: { id: true, userId: true, expiresAt: true },
  })

  const invalid = new AppError(400, 'This password reset link is invalid or has expired', 'INVALID_RESET_TOKEN')
  if (!row) throw invalid
  if (row.expiresAt.getTime() <= Date.now()) {
    await prisma.passwordResetToken.deleteMany({ where: { id: row.id } })
    throw invalid
  }

  const passwordHash = await hashPassword(newPassword)

  await prisma.$transaction(async (tx) => {
    const consumed = await tx.passwordResetToken.deleteMany({
      where: { id: row.id, expiresAt: { gt: new Date() } },
    })
    if (consumed.count !== 1) throw invalid

    await tx.user.update({ where: { id: row.userId }, data: { passwordHash } })
    // A successful reset invalidates every other outstanding link and session.
    await tx.passwordResetToken.deleteMany({ where: { userId: row.userId } })
    await tx.session.deleteMany({ where: { userId: row.userId } })
  })

  logger?.info({ event: 'auth.password_reset.completed', userId: row.userId }, 'password reset completed')
}
