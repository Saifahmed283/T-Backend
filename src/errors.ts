import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify'
import { ZodError } from 'zod'

export class AppError extends Error {
  constructor(public readonly statusCode: number, message: string, public readonly code = 'APP_ERROR') {
    super(message)
    this.name = 'AppError'
  }
}

export function registerErrorHandler(app: FastifyInstance) {
  app.setErrorHandler((error: unknown, _request: FastifyRequest, reply: FastifyReply) => {
    if (error instanceof ZodError) {
      return reply.status(400).send({ error: { code: 'VALIDATION_ERROR', message: 'Invalid request', details: error.flatten() } })
    }
    if (error instanceof AppError) {
      return reply.status(error.statusCode).send({ error: { code: error.code, message: error.message } })
    }
    // Framework-level problems (bad media type, malformed JSON, unknown route)
    // already carry an accurate 4xx status. Reporting them as 500 hides both the
    // real cause from the client and genuine server faults in the logs.
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
