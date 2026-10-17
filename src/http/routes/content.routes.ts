import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import {
  contentCounts,
  createContent,
  deleteContent,
  getContent,
  listContent,
  transitionContent,
  updateContent,
  workflowBoard,
} from '../../modules/content/content.service.js'
import { principalOf, requireAuth, requireRole } from '../middleware/requireAuth.js'
import { createContentSchema, contentListQuerySchema, transitionSchema, updateContentSchema } from '../schemas/content.schemas.js'

const collectionParamsSchema = z.object({ collectionId: z.string().min(1).max(50) })
const contentParamsSchema = z.object({ collectionId: z.string().min(1).max(50), id: z.string().min(1).max(50) })

export async function registerContentRoutes(app: FastifyInstance) {
  // Aggregate counts power the overview tiles, collection tabs and pipeline.
  app.get('/api/v1/content/counts', { preHandler: requireAuth }, async (request, reply) => {
    const { workspaceId } = principalOf(request)
    return reply.send(await contentCounts(workspaceId))
  })

  app.get('/api/v1/workflow/board', { preHandler: requireAuth }, async (request, reply) => {
    const { workspaceId } = principalOf(request)
    return reply.send(await workflowBoard(workspaceId))
  })

  app.get('/api/v1/content/:collectionId', { preHandler: requireAuth }, async (request, reply) => {
    const { collectionId } = collectionParamsSchema.parse(request.params)
    const query = contentListQuerySchema.parse(request.query)
    const { workspaceId } = principalOf(request)
    return reply.send(await listContent({ workspaceId, collectionId, ...query }))
  })

  app.post('/api/v1/content/:collectionId', { preHandler: requireAuth }, async (request, reply) => {
    const { collectionId } = collectionParamsSchema.parse(request.params)
    const body = createContentSchema.parse(request.body)
    const principal = principalOf(request)
    const item = await createContent({ workspaceId: principal.workspaceId, collectionId, userId: principal.userId, ...body })
    return reply.status(201).send(item)
  })

  app.get('/api/v1/content/:collectionId/:id', { preHandler: requireAuth }, async (request, reply) => {
    const { id } = contentParamsSchema.parse(request.params)
    const { workspaceId } = principalOf(request)
    return reply.send(await getContent(workspaceId, id))
  })

  app.patch('/api/v1/content/:collectionId/:id', { preHandler: requireAuth }, async (request, reply) => {
    const { id } = contentParamsSchema.parse(request.params)
    const body = updateContentSchema.parse(request.body)
    const principal = principalOf(request)
    const item = await updateContent({ workspaceId: principal.workspaceId, id, userId: principal.userId, ...body })
    return reply.send(item)
  })

  app.post('/api/v1/content/:collectionId/:id/transition', { preHandler: requireAuth }, async (request, reply) => {
    const { id } = contentParamsSchema.parse(request.params)
    const { to } = transitionSchema.parse(request.body)
    const principal = principalOf(request)
    const item = await transitionContent({
      workspaceId: principal.workspaceId,
      id,
      userId: principal.userId,
      role: principal.role,
      to,
    })
    return reply.send(item)
  })

  app.delete(
    '/api/v1/content/:collectionId/:id',
    { preHandler: [requireAuth, requireRole('admin')] },
    async (request, reply) => {
      const { id } = contentParamsSchema.parse(request.params)
      const principal = principalOf(request)
      return reply.send(await deleteContent(principal.workspaceId, id, principal.userId))
    },
  )
}
