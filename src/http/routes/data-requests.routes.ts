import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { AppError } from '../../modules/errors.js'
import { requireAdmin } from '../middleware/requireAdmin.js'
import {
  createDataRequest,
  listDataRequests,
  getDataRequest,
  updateDataRequest,
  deleteDataRequest,
  verifyDataRequest,
  sendStatusUpdateEmail,
  sendCompletionEmail,
  exportDataRequest,
  type DataRequestInput,
  type DataRequestListInput,
  DATA_REQUEST_TYPES,
} from '../../modules/data-requests/data-requests.service.js'

const createRequestSchema = z.object({
  type: z.enum(DATA_REQUEST_TYPES.map(t => t.value) as [string, ...string[]]),
  email: z.string().email().max(255),
  name: z.string().trim().max(120).optional(),
  details: z.string().trim().max(5000).optional(),
})

const listQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  status: z.string().trim().optional(),
  search: z.string().trim().max(100).optional(),
})

const updateRequestSchema = z.object({
  type: z.string().trim().min(1).max(50).optional(),
  email: z.string().email().max(255).optional(),
  name: z.string().trim().max(120).optional(),
  details: z.string().trim().max(5000).optional(),
  status: z.enum(['PENDING', 'IN_PROGRESS', 'COMPLETED', 'REJECTED']).optional(),
  response: z.string().trim().max(5000).optional(),
})

const verifySchema = z.object({
  token: z.string().trim().min(1),
})

export async function registerDataRequestRoutes(app: FastifyInstance) {
  // Public endpoint to create a data subject request
  app.post('/api/v1/data-requests', {
    config: { rateLimit: { max: 30, timeWindow: '15 minutes' } },
  }, async (request, reply) => {
    const data = createRequestSchema.parse(request.body)

    const input: DataRequestInput = {
      type: data.type as any,
      email: data.email,
      name: data.name,
      details: data.details,
    }

    const result = await createDataRequest(input)

    return reply.status(201).send({
      id: result.id,
      type: result.type,
      email: result.email,
      status: result.status,
      message: 'Request submitted successfully. Please check your email to verify your request.',
    })
  })

  // Public endpoint to verify a data request via email token
  app.get('/api/v1/data-requests/verify', async (request, reply) => {
    const { token } = verifySchema.parse(request.query)

    const result = await verifyDataRequest(token)

    return reply.send({
      id: result.id,
      email: result.email,
      type: result.type,
      message: 'Your request has been verified and is now being processed.',
    })
  })

  // Admin endpoints (require authentication)
  app.get('/api/v1/data-requests', {
    preHandler: [requireAdmin],
    config: { rateLimit: { max: 200, timeWindow: '15 minutes' } },
  }, async (request, reply) => {
    const workspaceId = request.workspaceId!
    const query = listQuerySchema.parse(request.query)

    const input: DataRequestListInput = {
      workspaceId,
      page: query.page,
      pageSize: query.pageSize,
      status: query.status,
      search: query.search,
    }

    const result = await listDataRequests(input)
    return reply.send(result)
  })

  app.get('/api/v1/data-requests/:id', {
    preHandler: [requireAdmin],
  }, async (request, reply) => {
    const workspaceId = request.workspaceId!
    const { id } = z.object({ id: z.string().trim().min(1) }).parse(request.params)

    const requestData = await getDataRequest(id, workspaceId)
    if (!requestData) {
      throw new AppError(404, 'Data request not found', 'DATA_REQUEST_NOT_FOUND')
    }

    return reply.send(requestData)
  })

  app.patch('/api/v1/data-requests/:id', {
    preHandler: [requireAdmin],
  }, async (request, reply) => {
    const workspaceId = request.workspaceId!
    const { id } = z.object({ id: z.string().trim().min(1) }).parse(request.params)
    const data = updateRequestSchema.parse(request.body)

    const previousRequest = await getDataRequest(id, workspaceId)
    if (!previousRequest) {
      throw new AppError(404, 'Data request not found', 'DATA_REQUEST_NOT_FOUND')
    }

    const updated = await updateDataRequest(id, workspaceId, data)

    // Send status update email if status changed
    if (data.status && data.status !== previousRequest.status) {
      await sendStatusUpdateEmail(id, workspaceId, data.status, data.response ?? null)
    }

    // Send completion email if status changed to completed
    if (data.status === 'COMPLETED' && previousRequest.status !== 'COMPLETED') {
      await sendCompletionEmail(id, workspaceId)
    }

    return reply.send(updated)
  })

  app.delete('/api/v1/data-requests/:id', {
    preHandler: [requireAdmin],
  }, async (request, reply) => {
    const workspaceId = request.workspaceId!
    const { id } = z.object({ id: z.string().trim().min(1) }).parse(request.params)

    const result = await deleteDataRequest(id, workspaceId)
    return reply.send(result)
  })

  // Export data for a specific request (admin only)
  app.post('/api/v1/data-requests/:id/export', {
    preHandler: [requireAdmin],
  }, async (request, reply) => {
    const workspaceId = request.workspaceId!
    const { id } = z.object({ id: z.string().trim().min(1) }).parse(request.params)

    const data = await exportDataRequest(id, workspaceId)
    return reply.send(data)
  })
}