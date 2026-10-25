import type { FastifyRequest } from 'fastify'
import { describe, expect, it } from 'vitest'
import { errorLogFields, fatalLogFields } from './errors.js'

describe('structured error logging', () => {
  it('logs the route pattern and request id but never request secrets', () => {
    const request = {
      id: 'req-123',
      method: 'POST',
      routeOptions: { url: '/api/v1/content/:collectionId' },
      body: { password: 'body-secret' },
      headers: { cookie: 'tm_session=header-secret', authorization: 'Bearer header-secret' },
      cookies: { tm_session: 'cookie-secret' },
      query: { token: 'query-secret' },
      url: '/api/v1/content/cases?token=url-secret',
    } as unknown as FastifyRequest

    const error = Object.assign(new Error('database connection lost'), { code: 'P1001' })
    const fields = errorLogFields(error, request, 500)
    const serialised = JSON.stringify(fields)

    expect(fields).toMatchObject({
      event: 'request.error',
      requestId: 'req-123',
      method: 'POST',
      route: '/api/v1/content/:collectionId',
      statusCode: 500,
      name: 'Error',
      message: 'database connection lost',
      code: 'P1001',
    })
    expect(fields.stack).toContain('database connection lost')

    // No body, header, cookie, query value or concrete URL may leak into logs.
    for (const secret of ['body-secret', 'header-secret', 'cookie-secret', 'query-secret', 'url-secret']) {
      expect(serialised).not.toContain(secret)
    }
  })

  it('marks requests outside a matched route', () => {
    const request = {
      id: 'req-456',
      method: 'GET',
      url: '/not-a-route',
    } as unknown as FastifyRequest

    expect(errorLogFields(new Error('boom'), request, 500)).toMatchObject({
      route: 'unmatched',
      message: 'boom',
    })
  })

  it('normalises non-Error process failures', () => {
    expect(fatalLogFields('unhandled_rejection', 'socket closed')).toMatchObject({
      event: 'unhandled_rejection',
      name: 'Error',
      message: 'socket closed',
    })
  })
})
