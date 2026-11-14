import type { Prisma } from '../../generated/prisma/client.js'
import { prisma } from '../../db/prisma.js'
import { AppError } from '../../modules/errors.js'
import { sendEmail } from '../../modules/email/email.service.js'
import { config } from '../../config/config.js'

export type MarketingList = 'newsletter' | 'events' | 'insights' | 'careers'

export const MARKETING_LISTS: { value: MarketingList; label: string; description: string }[] = [
  { value: 'newsletter', label: 'Monthly newsletter', description: 'Our monthly note: what we published, what we learned, and one thing we got wrong.' },
  { value: 'events', label: 'Event invitations', description: 'Invitations to webinars, workshops, and public events.' },
  { value: 'insights', label: 'Insights & publications', description: 'New policy briefs, practice notes, data products, and podcast episodes.' },
  { value: 'careers', label: 'Careers & opportunities', description: 'Open roles, expert network registration, and internship announcements.' },
]

export interface MarketingConsentInput {
  email: string
  lists: MarketingList[]
  source?: string
  locale?: string
}

export interface MarketingConsentResult {
  email: string
  lists: MarketingList[]
  status: 'confirmed' | 'pending'
  message: string
}

export interface UnsubscribeResult {
  email: string
  lists: MarketingList[]
  message: string
}

/**
 * Generate a single-click unsubscribe token for an email + list combination.
 * Uses a simple HMAC-like construction. In production this should use
 * Node's crypto.subtle or a proper signing key.
 */
export function generateUnsubscribeToken(email: string, list: MarketingList | 'all'): string {
  const secret = config.SESSION_SECRET
  const msg = `${email}:${list}:${secret}`
  let hash = 0
  for (let i = 0; i < msg.length; i++) {
    hash = ((hash << 5) - hash) + msg.charCodeAt(i)
    hash |= 0
  }
  return Math.abs(hash).toString(36)
}

export function verifyUnsubscribeToken(email: string, list: MarketingList | 'all', token: string): boolean {
  return generateUnsubscribeToken(email, list) === token
}

export function buildUnsubscribeUrl(baseUrl: string, email: string, list: MarketingList): string {
  const token = generateUnsubscribeToken(email, list)
  return `${baseUrl}/unsubscribe?email=${encodeURIComponent(email)}&list=${list}&token=${token}`
}

export function buildUnsubscribeAllUrl(baseUrl: string, email: string): string {
  const token = generateUnsubscribeToken(email, 'all')
  return `${baseUrl}/unsubscribe?email=${encodeURIComponent(email)}&list=all&token=${token}`
}

/**
 * Build a List-Unsubscribe header value for marketing emails.
 * RFC 8058: List-Unsubscribe: <https://example.com/unsubscribe?email=...&list=...&token=...>
 * List-Unsubscribe-Post: List-Unsubscribe=One-Click
 */
export function buildListUnsubscribeHeader(baseUrl: string, email: string, list: MarketingList): string {
  const url = buildUnsubscribeUrl(baseUrl, email, list)
  return `<${url}>`
}

export function buildListUnsubscribeAllHeader(baseUrl: string, email: string): string {
  const url = buildUnsubscribeAllUrl(baseUrl, email)
  return `<${url}>`
}

/**
 * Subscribe or update marketing consent for an email address.
 * Creates a confirmed subscriber record with granular list interests.
 */
export async function recordMarketingConsent(input: MarketingConsentInput): Promise<MarketingConsentResult> {
  const interests: Record<string, unknown> = {
    newsletter: false,
    events: false,
    insights: false,
    careers: false,
  }
  for (const list of input.lists) {
    interests[list] = true
  }

  const unsubscribeToken = generateUnsubscribeToken(input.email, 'all')

  const subscriber = await prisma.newsletterSubscriber.upsert({
    where: { email: input.email.toLowerCase() },
    create: {
      email: input.email.toLowerCase(),
      interests: interests as Prisma.InputJsonValue,
      locale: input.locale ?? 'en',
      source: input.source ?? 'web',
      status: 'CONFIRMED',
      confirmedAt: new Date(),
      unsubscribeToken,
    },
    update: {
      interests: interests as Prisma.InputJsonValue,
      locale: input.locale ?? 'en',
      source: input.source ?? 'web',
      status: 'CONFIRMED',
      confirmedAt: new Date(),
      unsubscribedAt: null,
      unsubscribeToken,
    },
  })

  return {
    email: subscriber.email,
    lists: input.lists,
    status: 'confirmed',
    message: 'Marketing consent recorded successfully.',
  }
}

/**
 * Unsubscribe an email from specific lists or all lists.
 * Validates the unsubscribe token before acting.
 */
export async function unsubscribeMarketing(
  email: string,
  list: MarketingList | 'all',
  token: string,
): Promise<UnsubscribeResult> {
  const subscriber = await prisma.newsletterSubscriber.findUnique({
    where: { email: email.toLowerCase() },
  })

  if (!subscriber) {
    throw new AppError(404, 'Subscriber not found', 'SUBSCRIBER_NOT_FOUND')
  }

  if (!verifyUnsubscribeToken(email, list, token)) {
    throw new AppError(400, 'Invalid or expired unsubscribe token', 'INVALID_UNSUBSCRIBE_TOKEN')
  }

  const interests: Record<string, unknown> = subscriber.interests as Record<string, unknown> ?? {}

  let listsToUnsubscribe: MarketingList[]
  if (list === 'all') {
    listsToUnsubscribe = MARKETING_LISTS.map(l => l.value)
  } else {
    listsToUnsubscribe = [list]
  }

  for (const l of listsToUnsubscribe) {
    interests[l] = false
  }

  const updated = await prisma.newsletterSubscriber.update({
    where: { id: subscriber.id },
    data: {
      interests: interests as Prisma.InputJsonValue,
      status: Object.values(interests).includes(true) ? 'CONFIRMED' : 'UNSUBSCRIBED',
      unsubscribedAt: Object.values(interests).includes(true) ? null : new Date(),
    },
  })

  return {
    email: updated.email,
    lists: listsToUnsubscribe,
    message: list === 'all'
      ? 'You have been unsubscribed from all marketing communications.'
      : `You have been unsubscribed from ${list}.`,
  }
}

/**
 * Get marketing consent status for an email address.
 */
export async function getMarketingConsent(email: string): Promise<{
  email: string
  lists: MarketingList[]
  status: string
  confirmedAt: Date | null
  unsubscribedAt: Date | null
} | null> {
  const subscriber = await prisma.newsletterSubscriber.findUnique({
    where: { email: email.toLowerCase() },
  })

  if (!subscriber) return null

  const interests: Record<string, unknown> = subscriber.interests as Record<string, unknown> ?? {}
  const lists: MarketingList[] = MARKETING_LISTS.filter(l => interests[l.value] === true).map(l => l.value)

  return {
    email: subscriber.email,
    lists,
    status: subscriber.status,
    confirmedAt: subscriber.confirmedAt,
    unsubscribedAt: subscriber.unsubscribedAt,
  }
}

/**
 * Send a confirmation email with List-Unsubscribe headers.
 */
export async function sendMarketingConfirmationEmail(
  email: string,
  lists: MarketingList[],
  baseUrl: string,
): Promise<void> {
  const listNames = MARKETING_LISTS.filter(l => lists.includes(l.value)).map(l => l.label).join(', ')

  await sendEmail({
    to: email,
    subject: 'Your marketing preferences have been confirmed',
    text: `
      You have subscribed to: ${listNames}.
      You can manage your preferences or unsubscribe at any time.

      ${buildListUnsubscribeAllHeader(baseUrl, email)}
    `,
    html: `
      <p>You have subscribed to: <strong>${listNames}</strong>.</p>
      <p>You can manage your preferences or unsubscribe at any time.</p>
      <p><a href="${buildUnsubscribeAllUrl(baseUrl, email)}">Unsubscribe from all</a></p>
    `,
    listUnsubscribe: buildListUnsubscribeAllHeader(baseUrl, email),
    kind: 'marketing.confirmation',
  })
}