import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { AppError } from '../../modules/errors.js'
import {
  recordTermsAcceptance,
  getTermsAcceptance,
  hasAcceptedCurrentPolicies,
  type TermsAcceptanceInput,
  PRIVACY_POLICY_VERSION,
  TERMS_OF_SERVICE_VERSION,
} from '../../modules/terms-acceptance/terms-acceptance.service.js'

const recordSchema = z.object({
  email: z.string().email().max(255),
  privacyVersion: z.string().trim().max(50).optional(),
  termsVersion: z.string().trim().max(50).optional(),
  ipAddress: z.string().trim().max(45).optional(),
  userAgent: z.string().trim().max(500).optional(),
  source: z.string().trim().max(50).optional(),
})

const checkSchema = z.object({
  email: z.string().email().max(255),
})

export async function registerTermsAcceptanceRoutes(app: FastifyInstance) {
  // Public: record terms acceptance
  app.post('/api/v1/terms-acceptance', {
    config: { rateLimit: { max: 30, timeWindow: '15 minutes' } },
  }, async (request, reply) => {
    const data = recordSchema.parse(request.body)

    const input: TermsAcceptanceInput = {
      email: data.email,
      privacyVersion: data.privacyVersion,
      termsVersion: data.termsVersion,
      ipAddress: data.ipAddress,
      userAgent: data.userAgent,
      source: data.source,
    }

    const result = await recordTermsAcceptance(input)

    return reply.status(201).send({
      id: result.id,
      email: result.email,
      privacyVersion: result.privacyVersion,
      termsVersion: result.termsVersion,
      acceptedAt: result.acceptedAt,
      message: 'Terms acceptance recorded.',
    })
  })

  // Public: check terms acceptance status for an email
  app.get('/api/v1/terms-acceptance', async (request, reply) => {
    const { email } = checkSchema.parse(request.query)

    const acceptance = await getTermsAcceptance(email)

    if (!acceptance) {
      return reply.send({
        email,
        accepted: false,
        privacyVersion: PRIVACY_POLICY_VERSION,
        termsVersion: TERMS_OF_SERVICE_VERSION,
        message: 'No terms acceptance record found.',
      })
    }

    const current = await hasAcceptedCurrentPolicies(email)

    return reply.send({
      email,
      accepted: current,
      privacyVersion: acceptance.privacyVersion,
      termsVersion: acceptance.termsVersion,
      acceptedAt: acceptance.acceptedAt,
      source: acceptance.source,
      currentPrivacyVersion: PRIVACY_POLICY_VERSION,
      currentTermsVersion: TERMS_OF_SERVICE_VERSION,
      message: current
        ? 'You have accepted the current Privacy Policy and Terms of Service.'
        : 'Your acceptance is on file but policy versions have changed. Please re-accept.',
    })
  })
}