import type { FastifyRequest } from 'fastify'
import { AppError } from '../../modules/errors.js'
import { resolveSession } from '../../modules/auth/auth.service.js'
import type { Principal } from '../../modules/auth/types.js'
import { SESSION_COOKIE } from '../helpers/session-cookie.js'

declare module 'fastify' {
  interface FastifyRequest {
    principal?: Principal
  }
}

export async function requireAuth(request: FastifyRequest): Promise<void> {
  const token = request.cookies[SESSION_COOKIE]
  if (!token) throw new AppError(401, 'Authentication required', 'UNAUTHENTICATED')
  const principal = await resolveSession(token)
  if (!principal) throw new AppError(401, 'Session is invalid or has expired', 'UNAUTHENTICATED')
  request.principal = principal
}

/** Narrows the optional `principal` for handlers that run behind `requireAuth`. */
export function principalOf(request: FastifyRequest): Principal {
  if (!request.principal) throw new AppError(401, 'Authentication required', 'UNAUTHENTICATED')
  return request.principal
}