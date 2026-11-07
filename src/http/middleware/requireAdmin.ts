import type { FastifyRequest } from 'fastify'
import { AppError } from '../../modules/errors.js'
import { requireAuth, principalOf } from './requireAuth.js'

declare module 'fastify' {
  interface FastifyRequest {
    workspaceId?: string
  }
}

/**
 * Restricts a route to admin users. Must run after `requireAuth`.
 * Adds `workspaceId` to the request from the principal.
 */
export async function requireAdmin(request: FastifyRequest): Promise<void> {
  await requireAuth(request)
  const principal = principalOf(request)
  if (principal.role !== 'admin') {
    throw new AppError(403, 'Admin access required', 'FORBIDDEN')
  }
  request.workspaceId = principal.workspaceId
}