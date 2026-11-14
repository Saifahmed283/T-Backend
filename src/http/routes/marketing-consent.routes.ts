import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import {
  recordMarketingConsent,
  unsubscribeMarketing,
  getMarketingConsent,
  sendMarketingConfirmationEmail,
} from '../../modules/marketing-consent/marketing-consent.service.js'
import { config } from '../../config/config.js'

const subscribeSchema = z.object({
  email: z.string().email().max(255),
  lists: z.array(z.enum(['newsletter', 'events', 'insights', 'careers'] as const)).default([]),
  source: z.string().trim().max(50).optional(),
  locale: z.string().trim().max(10).optional(),
})

const unsubscribeSchema = z.object({
  email: z.string().email().max(255),
  list: z.enum(['newsletter', 'events', 'insights', 'careers', 'all']),
  token: z.string().trim().min(1),
})

const consentQuerySchema = z.object({
  email: z.string().email().max(255),
})

export async function registerMarketingConsentRoutes(app: FastifyInstance) {
  // Public: subscribe to marketing lists
  app.post('/api/v1/marketing-consent', {
    config: { rateLimit: { max: 30, timeWindow: '15 minutes' } },
  }, async (request, reply) => {
    const data = subscribeSchema.parse(request.body)

    const result = await recordMarketingConsent({
      email: data.email,
      lists: data.lists,
      source: data.source,
      locale: data.locale,
    })

    // Send confirmation email with List-Unsubscribe header
    if (data.lists.length > 0) {
      await sendMarketingConfirmationEmail(data.email, data.lists, config.FRONTEND_ORIGIN)
    }

    return reply.status(201).send(result)
  })

  // Public: unsubscribe from marketing lists
  app.post('/api/v1/marketing-consent/unsubscribe', {
    config: { rateLimit: { max: 20, timeWindow: '15 minutes' } },
  }, async (request, reply) => {
    const data = unsubscribeSchema.parse(request.body)

    const result = await unsubscribeMarketing(data.email, data.list, data.token)

    return reply.send(result)
  })

  // Public: get marketing consent status for an email
  app.get('/api/v1/marketing-consent', async (request, reply) => {
    const { email } = consentQuerySchema.parse(request.query)

    const consent = await getMarketingConsent(email)

    if (!consent) {
      return reply.status(404).send({ error: { code: 'SUBSCRIBER_NOT_FOUND', message: 'Subscriber not found' } })
    }

    return reply.send(consent)
  })
}