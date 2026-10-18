import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { config } from '../../config/config.js'
import { AppError } from '../../modules/errors.js'
import {
  getPublicContent,
  listPublicContent,
  publicSiteSettings,
  publicSlugs,
} from '../../modules/content/content.service.js'

const collectionParamsSchema = z.object({ collectionId: z.string().trim().min(1).max(50) })

const itemParamsSchema = z.object({
  collectionId: z.string().trim().min(1).max(50),
  slug: z.string().trim().min(1).max(120),
})

const listQuerySchema = z.object({
  search: z.string().trim().max(100).optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
})

// Cache for a minute, let a CDN/browser serve stale for five while we revalidate.
const PUBLIC_CACHE = 'public, max-age=60, stale-while-revalidate=300'
const publicRateLimit = { config: { rateLimit: { max: 300, timeWindow: '15 minutes' } } }

export async function registerPublicRoutes(app: FastifyInstance) {
  // Read-only endpoints for the public marketing site. Deliberately
  // unauthenticated: the site has no session. Only PUBLISHED content from the
  // public workspace is ever returned, and internal fields are stripped.
  app.get('/api/v1/public/content/:collectionId', publicRateLimit, async (request, reply) => {
    const { collectionId } = collectionParamsSchema.parse(request.params)
    const query = listQuerySchema.parse(request.query)
    const result = await listPublicContent({ workspaceSlug: config.PUBLIC_WORKSPACE_SLUG, collectionId, ...query })
    return reply.header('Cache-Control', PUBLIC_CACHE).send(result)
  })

  app.get('/api/v1/public/content/:collectionId/:slug', publicRateLimit, async (request, reply) => {
    const { collectionId, slug } = itemParamsSchema.parse(request.params)
    const item = await getPublicContent(config.PUBLIC_WORKSPACE_SLUG, collectionId, slug)
    if (!item) throw new AppError(404, 'Content not found', 'NOT_FOUND')
    return reply.header('Cache-Control', PUBLIC_CACHE).send(item)
  })

  // Every published slug, grouped by collection — used at build time to
  // enumerate the prerendered detail routes.
  app.get('/api/v1/public/slugs', publicRateLimit, async (_request, reply) => {
    return reply.header('Cache-Control', PUBLIC_CACHE).send(await publicSlugs(config.PUBLIC_WORKSPACE_SLUG))
  })

  // The public subset of the site configuration (contact/legal/social blocks).
  app.get('/api/v1/public/settings', publicRateLimit, async (_request, reply) => {
    return reply.header('Cache-Control', PUBLIC_CACHE).send(await publicSiteSettings(config.PUBLIC_WORKSPACE_SLUG))
  })
}
