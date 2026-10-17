import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify'
import { ZodError } from 'zod'
import { AppError } from '../modules/errors.js'

/** Error carrying an HTTP status for framework-level problems (bad JSON, etc.). */
export class HttpError extends Error {
  constructor(public readonly statusCode: number, message: string, public readonly code = 'BAD_REQUEST') {
    super(message)
    this.name = 'HttpError'
  }
}

export function registerErrorHandler(app: FastifyInstance) {
  // Unknown routes must use the same { error: { code, message } } envelope as
  // every other failure, instead of Fastify's default shape.
  app.setNotFoundHandler((_request: FastifyRequest, reply: FastifyReply) => {
    return reply.status(404).send({ error: { code: 'NOT_FOUND', message: 'Route not found' } })
  })

  app.setErrorHandler((error: unknown, _request: FastifyRequest, reply: FastifyReply) => {
    if (error instanceof ZodError) {
      return reply.status(400).send({ error: { code: 'VALIDATION_ERROR', message: 'Invalid request', details: error.flatten() } })
    }
    if (error instanceof AppError) {
      return reply.status(error.statusCode).send({ error: { code: error.code, message: error.message } })
    }
    // Framework-level problems (bad media type, malformed JSON, unknown route)
    // carry an accurate 4xx status. Reporting them as 500 hides both the real
    // cause from the client and genuine server faults in the logs.
    const candidate = error as { statusCode?: unknown; code?: unknown; message?: unknown }
    const statusCode = typeof candidate.statusCode === 'number' ? candidate.statusCode : 500
    if (statusCode >= 400 && statusCode < 500) {
      const code = typeof candidate.code === 'string' ? candidate.code : 'BAD_REQUEST'
      const message = typeof candidate.message === 'string' ? candidate.message : 'Invalid request'
      return reply.status(statusCode).send({ error: { code, message } })
    }
    app.log.error(error)
    return reply.status(500).send({ error: { code: 'INTERNAL_ERROR', message: 'An unexpected error occurred' } })
  })
}
