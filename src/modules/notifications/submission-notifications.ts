import { config } from '../../config/config.js'
import type { SubmissionKind } from '../../http/schemas/submission.schemas.js'
import { sendEmail, type EmailLogger } from '../email/email.service.js'

export type SubmissionNotification = {
  id: string
  kind: SubmissionKind
  email?: string | null
  name?: string | null
  message?: string | null
  source?: string | null
  payload?: Record<string, unknown> | null
  createdAt: string
}

const LABELS: Record<SubmissionKind, string> = {
  CONTACT: 'contact message',
  EXPERT_REGISTRATION: 'expert registration',
  SEAT_RESERVATION: 'seat reservation',
  TENDER_INTEREST: 'tender interest',
  TEAM_PROPOSAL: 'team proposal',
  JOB_APPLICATION: 'job application',
  PUBLICATION_REQUEST: 'publication request',
  NEWSLETTER: 'newsletter sign-up',
  CONTRIBUTION: 'contribution',
}

function detailLines(submission: SubmissionNotification): string[] {
  const lines = [`Kind: ${submission.kind}`, `Received: ${submission.createdAt}`, `Reference: ${submission.id}`]
  if (submission.name) lines.push(`Name: ${submission.name}`)
  if (submission.email) lines.push(`Email: ${submission.email}`)
  if (submission.source) lines.push(`Source: ${submission.source}`)
  if (submission.message) lines.push('', submission.message)
  if (submission.payload && Object.keys(submission.payload).length > 0) {
    lines.push('', `Details: ${JSON.stringify(submission.payload).slice(0, 2_000)}`)
  }
  return lines
}

/**
 * Announce a new public-site submission to the team and acknowledge it to the
 * sender. Both messages are best-effort; a mail outage must never turn a
 * successfully recorded submission into an error for the visitor.
 */
export async function notifySubmissionCreated(submission: SubmissionNotification, logger?: EmailLogger): Promise<void> {
  const label = LABELS[submission.kind]
  const jobs: Promise<unknown>[] = []

  if (config.ADMIN_NOTIFICATION_EMAIL) {
    jobs.push(
      sendEmail(
        {
          to: config.ADMIN_NOTIFICATION_EMAIL,
          subject: `[TerraMorph] New ${label}`,
          text: [`A new ${label} was submitted on the website.`, '', ...detailLines(submission)].join('\n'),
          kind: 'submission.admin',
        },
        logger,
      ),
    )
  } else if (config.EMAIL_ENABLED) {
    logger?.warn(
      { event: 'email.skipped', reason: 'no_admin_recipient', submissionId: submission.id, kind: submission.kind },
      'ADMIN_NOTIFICATION_EMAIL is unset; submission notice not sent',
    )
  }

  if (submission.email) {
    jobs.push(
      sendEmail(
        {
          to: submission.email,
          subject: 'We received your message — TerraMorph',
          text: [
            `Thank you for contacting TerraMorph. We have received your ${label} and will respond if a reply is needed.`,
            '',
            `Reference: ${submission.id}`,
            '',
            'TerraMorph Advisory LLC',
            'New Cairo, Egypt',
          ].join('\n'),
          kind: 'submission.receipt',
        },
        logger,
      ),
    )
  }

  // sendEmail never rejects, but keep the guard so a future provider cannot
  // break the request that triggered the notification.
  await Promise.allSettled(jobs)
}
