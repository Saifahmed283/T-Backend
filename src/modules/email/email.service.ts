import { config } from '../../config/config.js'

/** The small slice of Fastify's logger the mailer needs. */
export type EmailLogger = {
  info: (context: Record<string, unknown>, message?: string) => void
  warn: (context: Record<string, unknown>, message?: string) => void
  error: (context: Record<string, unknown>, message?: string) => void
}

export type EmailMessage = {
  to: string
  subject: string
  text: string
  /** Optional tag used in logs, e.g. 'submission.receipt'. */
  kind?: string
}

export type SendEmailResult = {
  sent: boolean
  reason?: 'disabled' | 'missing_recipient' | 'provider_error'
}

// The `memory` provider exists so the integration suite can assert on outbound
// mail without a network. It is rejected in production (see config.ts).
const outbox: EmailMessage[] = []

export function getEmailOutbox(): EmailMessage[] {
  return outbox.map((message) => ({ ...message }))
}

export function clearEmailOutbox(): void {
  outbox.length = 0
}

/**
 * Send one transactional email.
 *
 * Never throws: a failure to send must not fail the request that triggered it
 * (a submission is still recorded, a password can still be changed after the
 * user follows a link). Every outcome is logged so a missing provider is visible
 * in operations rather than silent.
 */
export async function sendEmail(message: EmailMessage, logger?: EmailLogger): Promise<SendEmailResult> {
  if (!message.to) {
    logger?.warn({ event: 'email.skipped', reason: 'missing_recipient', kind: message.kind }, 'email skipped: no recipient')
    return { sent: false, reason: 'missing_recipient' }
  }

  if (!config.EMAIL_ENABLED) {
    logger?.info(
      { event: 'email.skipped', reason: 'disabled', to: message.to, subject: message.subject, kind: message.kind },
      'email disabled; message not sent',
    )
    return { sent: false, reason: 'disabled' }
  }

  try {
    switch (config.EMAIL_PROVIDER) {
      case 'memory':
        outbox.push({ ...message })
        break
      case 'log':
        // Development/fallback provider: the complete message is visible in the
        // server log so a reset link can be followed locally.
        logger?.info(
          { event: 'email.sent', provider: 'log', to: message.to, subject: message.subject, kind: message.kind, text: message.text },
          'email rendered to log',
        )
        break
    }
    if (config.EMAIL_PROVIDER !== 'log') {
      logger?.info(
        { event: 'email.sent', provider: config.EMAIL_PROVIDER, to: message.to, subject: message.subject, kind: message.kind },
        'email sent',
      )
    }
    return { sent: true }
  } catch (error) {
    logger?.error(
      {
        event: 'email.failed',
        provider: config.EMAIL_PROVIDER,
        to: message.to,
        subject: message.subject,
        kind: message.kind,
        err: error instanceof Error ? error.message : String(error),
      },
      'email delivery failed',
    )
    return { sent: false, reason: 'provider_error' }
  }
}
