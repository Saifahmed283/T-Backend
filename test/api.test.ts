import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import type { FastifyInstance } from 'fastify'
import { buildApp } from '../src/app.js'
import { prisma } from '../src/db/prisma.js'
import { hashPassword } from '../src/security/passwords.js'

const PASSWORD = 'Integration-Password-1'

let app: FastifyInstance

// Two independent tenants. Every test asserts that data never crosses between them.
let wsA: { id: string; slug: string }
let wsB: { id: string; slug: string }
let userA: { id: string; email: string }
let userB: { id: string; email: string }
const assignmentA = 'TEST-A-001'
const assignmentB = 'TEST-B-001'

async function seedFixtures() {
  wsA = await prisma.workspace.create({ data: { name: 'Tenant A', slug: 'tenant-a' } })
  wsB = await prisma.workspace.create({ data: { name: 'Tenant B', slug: 'tenant-b' } })

  const hash = await hashPassword(PASSWORD)
  userA = await prisma.user.create({ data: { name: 'User A', email: 'a@test.local', passwordHash: hash } })
  userB = await prisma.user.create({ data: { name: 'User B', email: 'b@test.local', passwordHash: hash } })
  await prisma.workspaceMember.createMany({
    data: [
      { workspaceId: wsA.id, userId: userA.id, role: 'admin' },
      { workspaceId: wsB.id, userId: userB.id, role: 'admin' },
    ],
  })

  await prisma.assignment.createMany({
    data: [
      { id: assignmentA, name: 'Tenant A secret work', client: 'A Client', sector: 'Public', value: 100, status: 'ON_TRACK', stage: 'G3', workspaceId: wsA.id, leadId: userA.id },
      { id: assignmentB, name: 'Tenant B secret work', client: 'B Client', sector: 'Private', value: 250, status: 'BLOCKED', stage: 'G6', workspaceId: wsB.id, leadId: userB.id },
    ],
  })

  await prisma.activityLog.createMany({
    data: [
      { workspaceId: wsA.id, assignmentId: assignmentA, type: 'NOTE_ADDED', message: 'Tenant A note', userId: userA.id },
      { workspaceId: wsB.id, assignmentId: assignmentB, type: 'NOTE_ADDED', message: 'Tenant B note', userId: userB.id },
    ],
  })

  await prisma.expert.createMany({
    data: [
      { workspaceId: wsA.id, name: 'Expert A', email: 'expert-a@test.local', sector: 'Education', status: 'VETTED' },
      { workspaceId: wsB.id, name: 'Expert B', email: 'expert-b@test.local', sector: 'Finance', status: 'REGISTERED' },
    ],
  })
}

async function clearFixtures() {
  await prisma.session.deleteMany()
  await prisma.activityLog.deleteMany()
  await prisma.assignment.deleteMany()
  await prisma.expert.deleteMany()
  await prisma.submission.deleteMany()
  await prisma.workspaceMember.deleteMany()
  await prisma.workspace.deleteMany()
  await prisma.user.deleteMany()
}

async function login(email: string): Promise<string> {
  const res = await app.inject({
    method: 'POST',
    url: '/api/v1/auth/login',
    payload: { email, password: PASSWORD },
  })
  expect(res.statusCode).toBe(200)
  const cookie = res.headers['set-cookie']
  const raw = Array.isArray(cookie) ? cookie[0] : cookie
  return String(raw).split(';')[0]!
}

beforeAll(async () => {
  app = await buildApp()
  await app.ready()
})

afterAll(async () => {
  await clearFixtures()
  await app.close()
  await prisma.$disconnect()
})

beforeEach(async () => {
  await clearFixtures()
  await seedFixtures()
})

describe('authentication', () => {
  it('rejects protected routes without a session cookie', async () => {
    for (const url of ['/api/v1/dashboard/summary', '/api/v1/assignments', `/api/v1/assignments/${assignmentA}`, '/api/v1/activity', '/api/v1/experts', '/api/v1/submissions', '/api/v1/auth/me']) {
      const res = await app.inject({ method: 'GET', url })
      expect(res.statusCode, url).toBe(401)
      expect(res.json().error.code).toBe('UNAUTHENTICATED')
    }
  })

  it('leaves the health check public', async () => {
    const res = await app.inject({ method: 'GET', url: '/health' })
    expect(res.statusCode).toBe(200)
    expect(res.json().status).toBe('ok')
  })

  it('rejects an unknown email with the same code as a bad password', async () => {
    const unknown = await app.inject({ method: 'POST', url: '/api/v1/auth/login', payload: { email: 'nobody@test.local', password: PASSWORD } })
    const wrong = await app.inject({ method: 'POST', url: '/api/v1/auth/login', payload: { email: 'a@test.local', password: 'not-the-password' } })
    expect(unknown.statusCode).toBe(401)
    expect(wrong.statusCode).toBe(401)
    // Identical responses prevent account enumeration.
    expect(unknown.json().error.code).toBe(wrong.json().error.code)
    expect(unknown.json().error.message).toBe(wrong.json().error.message)
  })

  it('never returns the password hash', async () => {
    const cookie = await login('a@test.local')
    const res = await app.inject({ method: 'GET', url: '/api/v1/auth/me', headers: { cookie } })
    expect(res.statusCode).toBe(200)
    expect(JSON.stringify(res.json())).not.toContain('scrypt')
    expect(res.json().user.email).toBe('a@test.local')
  })

  it('sets an httpOnly, same-site cookie and stores only a digest', async () => {
    const res = await app.inject({ method: 'POST', url: '/api/v1/auth/login', payload: { email: 'a@test.local', password: PASSWORD } })
    const raw = String(res.headers['set-cookie'])
    expect(raw).toMatch(/HttpOnly/i)
    expect(raw).toMatch(/SameSite=Lax/i)
    const token = raw.split(';')[0]!.split('=')[1]!
    const rows = await prisma.session.findMany()
    expect(rows).toHaveLength(1)
    // The raw token must not be recoverable from the database.
    expect(JSON.stringify(rows)).not.toContain(token)
  })

  it('rejects an unknown session token', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/v1/dashboard/summary', headers: { cookie: 'tm_session=not-a-real-token' } })
    expect(res.statusCode).toBe(401)
  })

  it('rejects an expired session and cleans it up', async () => {
    const cookie = await login('a@test.local')
    await prisma.session.updateMany({ data: { expiresAt: new Date(Date.now() - 1000) } })
    const res = await app.inject({ method: 'GET', url: '/api/v1/dashboard/summary', headers: { cookie } })
    expect(res.statusCode).toBe(401)
    expect(await prisma.session.count()).toBe(0)
  })

  it('invalidates the session when membership is revoked', async () => {
    const cookie = await login('a@test.local')
    await prisma.workspaceMember.deleteMany({ where: { userId: userA.id } })
    const res = await app.inject({ method: 'GET', url: '/api/v1/dashboard/summary', headers: { cookie } })
    expect(res.statusCode).toBe(401)
  })

  it('destroys the session on logout, including for a bodyless request', async () => {
    const cookie = await login('a@test.local')
    const res = await app.inject({ method: 'POST', url: '/api/v1/auth/logout', headers: { cookie } })
    expect(res.statusCode).toBe(204)
    expect(await prisma.session.count()).toBe(0)
    const after = await app.inject({ method: 'GET', url: '/api/v1/dashboard/summary', headers: { cookie } })
    expect(after.statusCode).toBe(401)
  })

  it('requires authentication to change a password', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/password',
      payload: { currentPassword: PASSWORD, newPassword: 'Another-Password-9' },
    })
    expect(res.statusCode).toBe(401)
  })

  it('rejects a password change with the wrong current password', async () => {
    const cookie = await login('a@test.local')
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/password',
      headers: { cookie },
      payload: { currentPassword: 'wrong', newPassword: 'Another-Password-9' },
    })
    expect(res.statusCode).toBe(403)
  })

  it('logs other devices out after a password change', async () => {
    const cookie = await login('a@test.local')
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/password',
      headers: { cookie },
      payload: { currentPassword: PASSWORD, newPassword: 'Another-Password-9' },
    })
    expect(res.statusCode).toBe(204)
    expect(await prisma.session.count()).toBe(0)
  })
})

describe('workspace tenancy', () => {
  it('scopes the assignment list to the caller workspace', async () => {
    const cookie = await login('a@test.local')
    const res = await app.inject({ method: 'GET', url: '/api/v1/assignments', headers: { cookie } })
    expect(res.statusCode).toBe(200)
    const ids = res.json().items.map((i: { id: string }) => i.id)
    expect(ids).toEqual([assignmentA])
  })

  it('refuses to read another tenant assignment by id', async () => {
    const cookie = await login('a@test.local')
    const res = await app.inject({ method: 'GET', url: `/api/v1/assignments/${assignmentB}`, headers: { cookie } })
    // 404 rather than 403 so ids cannot be probed across tenants.
    expect(res.statusCode).toBe(404)
  })

  it('scopes the summary aggregates to the caller workspace', async () => {
    const cookie = await login('a@test.local')
    const res = await app.inject({ method: 'GET', url: '/api/v1/dashboard/summary', headers: { cookie } })
    const body = res.json()
    expect(body.activeAssignments).toBe(1)
    expect(body.contractValue).toBe(100)
    expect(body.expertsOnRoster).toBe(1)
    expect(body.notesReceived).toBe(1)
    expect(body.statuses).toEqual({ ON_TRACK: 1 })
  })

  it('counts Experts rather than Users for the roster', async () => {
    const cookie = await login('a@test.local')
    const body = (await app.inject({ method: 'GET', url: '/api/v1/dashboard/summary', headers: { cookie } })).json()
    // One Expert exists for tenant A even though a User row also exists.
    expect(body.expertsOnRoster).toBe(1)
  })

  it('does not let search reach across tenants', async () => {
    const cookie = await login('a@test.local')
    const res = await app.inject({ method: 'GET', url: '/api/v1/assignments?search=Tenant B', headers: { cookie } })
    expect(res.json().items).toHaveLength(0)
  })

  it('scopes the activity feed and never leaks another tenant entries', async () => {
    const cookie = await login('a@test.local')
    const res = await app.inject({ method: 'GET', url: '/api/v1/activity', headers: { cookie } })
    const messages = res.json().items.map((i: { message: string }) => i.message)
    expect(messages).toEqual(['Tenant A note'])
  })

  it('scopes experts to the caller workspace', async () => {
    const cookie = await login('a@test.local')
    const res = await app.inject({ method: 'GET', url: '/api/v1/experts', headers: { cookie } })
    expect(res.json().items.map((e: { email: string }) => e.email)).toEqual(['expert-a@test.local'])
  })

  it('gives each tenant its own totals', async () => {
    const cookieA = await login('a@test.local')
    const cookieB = await login('b@test.local')
    const a = (await app.inject({ method: 'GET', url: '/api/v1/dashboard/summary', headers: { cookie: cookieA } })).json()
    const b = (await app.inject({ method: 'GET', url: '/api/v1/dashboard/summary', headers: { cookie: cookieB } })).json()
    expect(a.contractValue).toBe(100)
    expect(b.contractValue).toBe(250)
    expect(a.statuses).toEqual({ ON_TRACK: 1 })
    expect(b.statuses).toEqual({ BLOCKED: 1 })
  })
})

describe('list endpoints', () => {
  it('paginates and reports accurate totals', async () => {
    await prisma.assignment.createMany({
      data: Array.from({ length: 9 }, (_, i) => ({
        id: `TEST-A-100-${i}`,
        name: `Extra ${i}`,
        client: 'A Client',
        sector: 'Public',
        value: 1,
        status: 'AT_RISK' as const,
        stage: 'G1' as const,
        workspaceId: wsA.id,
        leadId: userA.id,
      })),
    })
    const cookie = await login('a@test.local')
    const first = (await app.inject({ method: 'GET', url: '/api/v1/assignments?page=1&pageSize=4', headers: { cookie } })).json()
    expect(first.items).toHaveLength(4)
    expect(first.pagination).toEqual({ page: 1, pageSize: 4, total: 10, totalPages: 3 })

    const last = (await app.inject({ method: 'GET', url: '/api/v1/assignments?page=3&pageSize=4', headers: { cookie } })).json()
    expect(last.items).toHaveLength(2)
  })

  it('filters by status', async () => {
    const cookie = await login('a@test.local')
    const res = await app.inject({ method: 'GET', url: '/api/v1/assignments?status=BLOCKED', headers: { cookie } })
    expect(res.json().items).toHaveLength(0)
  })

  it('rejects an invalid page size', async () => {
    const cookie = await login('a@test.local')
    const res = await app.inject({ method: 'GET', url: '/api/v1/assignments?pageSize=1000', headers: { cookie } })
    expect(res.statusCode).toBe(400)
    expect(res.json().error.code).toBe('VALIDATION_ERROR')
  })

  it('reports a validation error for a malformed id', async () => {
    const cookie = await login('a@test.local')
    const res = await app.inject({ method: 'GET', url: `/api/v1/assignments/${'x'.repeat(80)}`, headers: { cookie } })
    expect(res.statusCode).toBe(400)
  })
})

describe('public submissions', () => {
  it('accepts an anonymous contact submission without a session', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/submissions',
      payload: { kind: 'CONTACT', email: 'Reader@Example.org', name: 'A reader', message: 'Hello', source: 'contact', payload: { role: 'policy maker' } },
    })
    expect(res.statusCode).toBe(201)
    const body = res.json()
    expect(body.kind).toBe('CONTACT')
    expect(body.status).toBe('NEW')
    expect(typeof body.id).toBe('string')
    const row = await prisma.submission.findFirst({ where: { id: body.id } })
    expect(row?.email).toBe('reader@example.org')
    expect(row?.payload).toEqual({ role: 'policy maker' })
  })

  it('requires an email for every kind except CONTRIBUTION', async () => {
    const missing = await app.inject({ method: 'POST', url: '/api/v1/submissions', payload: { kind: 'EXPERT_REGISTRATION', name: 'No email' } })
    expect(missing.statusCode).toBe(400)
    expect(missing.json().error.code).toBe('VALIDATION_ERROR')

    const anonymous = await app.inject({ method: 'POST', url: '/api/v1/submissions', payload: { kind: 'CONTRIBUTION' } })
    expect(anonymous.statusCode).toBe(201)
  })

  it('rejects an unknown kind and unknown fields', async () => {
    const kind = await app.inject({ method: 'POST', url: '/api/v1/submissions', payload: { kind: 'NONSENSE', email: 'a@b.co' } })
    expect(kind.statusCode).toBe(400)
    const extra = await app.inject({ method: 'POST', url: '/api/v1/submissions', payload: { kind: 'CONTACT', email: 'a@b.co', admin: true } })
    expect(extra.statusCode).toBe(400)
  })

  it('lists submissions for an authenticated admin, newest first', async () => {
    await app.inject({ method: 'POST', url: '/api/v1/submissions', payload: { kind: 'TENDER_INTEREST', email: 'a@b.co', payload: { item: 'Urban mobility' } } })
    await app.inject({ method: 'POST', url: '/api/v1/submissions', payload: { kind: 'SEAT_RESERVATION', email: 'c@d.co', payload: { programme: 'LED course' } } })

    const cookie = await login('a@test.local')
    const all = await app.inject({ method: 'GET', url: '/api/v1/submissions', headers: { cookie } })
    expect(all.statusCode).toBe(200)
    expect(all.json().pagination.total).toBe(2)

    const filtered = await app.inject({ method: 'GET', url: '/api/v1/submissions?kind=SEAT_RESERVATION', headers: { cookie } })
    expect(filtered.json().items).toHaveLength(1)
    expect(filtered.json().items[0].payload).toEqual({ programme: 'LED course' })
  })
})