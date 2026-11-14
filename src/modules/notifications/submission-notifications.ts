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
  // Preferred language of the submitter; defaults to 'en'.
  locale: 'en' | 'ar'
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
  MORPHE_LEAD: 'morphe intake lead',
}

function detailLines(submission: SubmissionNotification, locale: 'en' | 'ar'): string[] {
  const kindLabel = locale === 'ar' ? kindLabelAr(submission.kind) : submission.kind
  const lines = [
    `${locale === 'ar' ? 'النوع:' : 'Kind:'} ${kindLabel}`,
    `${locale === 'ar' ? 'استلم في:' : 'Received:'} ${submission.createdAt}`,
    `${locale === 'ar' ? 'المرجع:' : 'Reference:'} ${submission.id}`,
  ]
  if (submission.name) lines.push(`${locale === 'ar' ? 'الاسم:' : 'Name:'} ${submission.name}`)
  if (submission.email) lines.push(`${locale === 'ar' ? 'البريد الإلكتروني:' : 'Email:'} ${submission.email}`)
  if (submission.source) lines.push(`${locale === 'ar' ? 'المصدر:' : 'Source:'} ${submission.source}`)
  if (submission.message) lines.push('', submission.message)
  if (submission.payload && Object.keys(submission.payload).length > 0) {
    lines.push('', `${locale === 'ar' ? 'تفاصيل:' : 'Details:'} ${JSON.stringify(submission.payload).slice(0, 2_000)}`)
  }
  return lines
}

function kindLabelAr(kind: SubmissionKind): string {
  const labels: Record<SubmissionKind, string> = {
    CONTACT: 'رسالة تواصل',
    EXPERT_REGISTRATION: 'تسجيل خبير',
    SEAT_RESERVATION: 'حجز مقعد',
    TENDER_INTEREST: 'اهتمام بمناقصة',
    TEAM_PROPOSAL: 'اقتراح فريق',
    JOB_APPLICATION: 'طلب وظيفة',
    PUBLICATION_REQUEST: 'طلب منشور',
    NEWSLETTER: 'اشتراك في النشرة',
    CONTRIBUTION: 'مساهمة',
    MORPHE_LEAD: 'Lead من مورفي',
  }
  return labels[kind]
}

/* Bilingual HTML templates. Inline CSS only — no external template service.
   Navy/gold brand, Cormorant Garamond headings + Jost body. */
function brand(locale: 'en' | 'ar'): { title: string; footer: string; dir: string } {
  return locale === 'ar'
    ? { title: 'تيرامورف', footer: 'تيرامورف للاستشارات · القاهرة، مصر · نفع للخير', dir: 'rtl' }
    : { title: 'TerraMorph', footer: 'TerraMorph Advisory LLC · New Cairo, Egypt · Leverage for Good', dir: 'ltr' }
}

function adminTemplate(
  kind: SubmissionKind,
  label: string,
  submission: SubmissionNotification,
  locale: 'en' | 'ar',
): { subject: string; text: string; html: string } {
  const b = brand(locale)
  const lines = detailLines(submission, locale)
  const intro =
    locale === 'ar'
      ? `وصل مساهم جديد عبر موقع الويب — ${label}.`
      : `A new ${label} was submitted on the website.`
  const subject =
    locale === 'ar' ? `[تيرامورف] مساهم جديد: ${label}` : `[TerraMorph] New ${label}`
  const html = [
    `<!doctype html><html lang="${locale}" dir="${b.dir}">`,
    `<head><meta charset="utf-8"><title>${subject}</title></head>`,
    `<body style="font-family:'Jost',system-ui,sans-serif;background:#fbf8f1;color:#132b45;margin:0;padding:24px">`,
    `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">`,
    `<tr><td align="center">`,
    `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;background:#ffffff;border:1px solid #d9d4c7;border-top:4px solid #76602c">`,
    `<tr><td style="padding:28px 32px">`,
    `<h1 style="font-family:'Cormorant Garamond',serif;font-size:22px;margin:0 0 16px 0;color:#132b45">${escapeHtml(subject)}</h1>`,
    `<p style="font-size:14px;line-height:1.6;margin:0 0 18px 0">${escapeHtml(intro)}</p>`,
    `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">`,
    `<tr><td style="font-family:'Courier New',monospace;font-size:12px;line-height:1.8;color:#5e6772">`,
    escapeHtml(lines.join('\n')),
    `</td></tr>`,
    `</table>`,
    `<p style="font-size:12px;line-height:1.6;color:#5e6772;margin:24px 0 0 0">${escapeHtml(b.footer)}</p>`,
    `</td></tr>`,
    `</table>`,
    `</td></tr>`,
    `</table>`,
    `</body></html>`,
  ].join('')
  return { subject, text: [intro, '', ...lines, '', b.footer].join('\n'), html }
}

function receiptTemplate(
  label: string,
  submission: SubmissionNotification,
  locale: 'en' | 'ar',
): { subject: string; text: string; html: string } {
  const b = brand(locale)
  const subject =
    locale === 'ar'
      ? `استلمنا رسالتك — تيرامورف`
      : `We received your message — TerraMorph`
  const thanks =
    locale === 'ar'
      ? `شكراً لتواصلك مع تيرامورف. استلمنا ${label} وسنرد عليك إن لزم الأمر.`
      : `Thank you for contacting TerraMorph. We have received your ${label} and will respond if a reply is needed.`
  const html = [
    `<!doctype html><html lang="${locale}" dir="${b.dir}">`,
    `<head><meta charset="utf-8"><title>${subject}</title></head>`,
    `<body style="font-family:'Jost',system-ui,sans-serif;background:#fbf8f1;color:#132b45;margin:0;padding:24px">`,
    `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">`,
    `<tr><td align="center">`,
    `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;background:#ffffff;border:1px solid #d9d4c7;border-top:4px solid #76602c">`,
    `<tr><td style="padding:28px 32px">`,
    `<h1 style="font-family:'Cormorant Garamond',serif;font-size:22px;margin:0 0 16px 0;color:#132b45">${escapeHtml(subject)}</h1>`,
    `<p style="font-size:14px;line-height:1.6;margin:0 0 18px 0">${escapeHtml(thanks)}</p>`,
    `<p style="font-size:14px;line-height:1.6;margin:0 0 18px 0">${locale === 'ar' ? 'المرجع:' : 'Reference:'} <strong>${escapeHtml(submission.id)}</strong></p>`,
    `<p style="font-size:12px;line-height:1.6;color:#5e6772;margin:24px 0 0 0">${escapeHtml(b.footer)}</p>`,
    `</td></tr>`,
    `</table>`,
    `</td></tr>`,
    `</table>`,
    `</body></html>`,
  ].join('')
  return {
    subject,
    text: [thanks, '', `${locale === 'ar' ? 'المرجع:' : 'Reference:'} ${submission.id}`, '', b.footer].join('\n'),
    html,
  }
}

function escapeHtml(value: string): string {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

/**
 * Announce a new public-site submission to the team and acknowledge it to the
 * sender. Both messages are best-effort; a mail outage must never turn a
 * successfully recorded submission into an error for the visitor.
 *
 * `CONTRIBUTION` receipts are deliberately excluded — contributors opt out of
 * email. The admin notice still goes to `ADMIN_NOTIFICATION_EMAIL` when set.
 */
export async function notifySubmissionCreated(submission: SubmissionNotification, logger?: EmailLogger): Promise<void> {
  const label = LABELS[submission.kind]
  const locale = submission.locale ?? 'en'
  const jobs: Promise<unknown>[] = []

  if (config.ADMIN_NOTIFICATION_EMAIL) {
    const admin = adminTemplate(submission.kind, label, submission, locale)
    jobs.push(
      sendEmail(
        {
          to: config.ADMIN_NOTIFICATION_EMAIL,
          subject: admin.subject,
          text: admin.text,
          html: admin.html,
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

  // CONTRIBUTION is anonymous-by-design: no receipt to the submitter.
  if (submission.email && submission.kind !== 'CONTRIBUTION') {
    const receipt = receiptTemplate(label, submission, locale)
    jobs.push(
      sendEmail(
        {
          to: submission.email!,
          subject: receipt.subject,
          text: receipt.text,
          html: receipt.html,
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
