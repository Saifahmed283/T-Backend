import { prisma } from '../../db/prisma.js'
import { AppError } from '../../modules/errors.js'

/** Current policy versions. Bump these when policies change materially. */
export const PRIVACY_POLICY_VERSION = '1.0'
export const TERMS_OF_SERVICE_VERSION = '1.0'

export interface TermsAcceptanceInput {
  email: string
  privacyVersion?: string
  termsVersion?: string
  ipAddress?: string
  userAgent?: string
  source?: string
}

export interface TermsAcceptanceResult {
  id: string
  email: string
  privacyVersion: string
  termsVersion: string
  acceptedAt: Date
  source: string | null
}

/**
 * Record (or upsert) a terms acceptance for an email address.
 * One record per email — re-acceptance updates the versions/timestamp.
 */
export async function recordTermsAcceptance(
  input: TermsAcceptanceInput,
): Promise<TermsAcceptanceResult> {
  const acceptance = await prisma.termsAcceptance.upsert({
    where: { email: input.email.toLowerCase() },
    create: {
      email: input.email.toLowerCase(),
      privacyVersion: input.privacyVersion ?? PRIVACY_POLICY_VERSION,
      termsVersion: input.termsVersion ?? TERMS_OF_SERVICE_VERSION,
      ipAddress: input.ipAddress ?? null,
      userAgent: input.userAgent ?? null,
      source: input.source ?? null,
    },
    update: {
      privacyVersion: input.privacyVersion ?? PRIVACY_POLICY_VERSION,
      termsVersion: input.termsVersion ?? TERMS_OF_SERVICE_VERSION,
      ipAddress: input.ipAddress ?? null,
      userAgent: input.userAgent ?? null,
      source: input.source ?? null,
      acceptedAt: new Date(),
    },
  })

  return {
    id: acceptance.id,
    email: acceptance.email,
    privacyVersion: acceptance.privacyVersion,
    termsVersion: acceptance.termsVersion,
    acceptedAt: acceptance.acceptedAt,
    source: acceptance.source,
  }
}

/**
 * Get the terms acceptance record for an email address.
 */
export async function getTermsAcceptance(email: string): Promise<TermsAcceptanceResult | null> {
  const acceptance = await prisma.termsAcceptance.findUnique({
    where: { email: email.toLowerCase() },
  })

  if (!acceptance) return null

  return {
    id: acceptance.id,
    email: acceptance.email,
    privacyVersion: acceptance.privacyVersion,
    termsVersion: acceptance.termsVersion,
    acceptedAt: acceptance.acceptedAt,
    source: acceptance.source,
  }
}

/**
 * Check whether an email has accepted the current policy versions.
 */
export async function hasAcceptedCurrentPolicies(email: string): Promise<boolean> {
  const acceptance = await getTermsAcceptance(email)
  if (!acceptance) return false

  return (
    acceptance.privacyVersion === PRIVACY_POLICY_VERSION &&
    acceptance.termsVersion === TERMS_OF_SERVICE_VERSION
  )
}