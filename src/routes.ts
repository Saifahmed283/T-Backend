import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { prisma } from './prisma.js'
import { AppError } from './errors.js'
import {
  SESSION_COOKIE,
  clearSessionCookie,
  createSession,
  destroySession,
  hashPassword,
  principalOf,
  requireAuth,
  setSessionCookie,
  verifyPassword,
} from './auth.js'

const listQuerySchema = z.object({
  status: z.enum(['ON_TRACK', 'AT_RISK', 'BLOCKED']).optional(),
  search: z.string().trim().max(100).optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
})

const feedQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(20),
  before: z.string().datetime().optional(),
})

const loginSchema = z.object({
  email: z.string().email().max(254),
  password: z.string().min(1).max(200),
})

const idSchema = z.object({ id: z.string().min(1).max(50) })

const assignmentSelect = {
  id: true,
  name: true,
  client: true,
  sector: true,
  value: true,
  status: true,
  stage: true,
  lead: { select: { id: true, name: true } },
  createdAt: true,
  updatedAt: true,
} as const

export async function registerRoutes(app: FastifyInstance) {
  app.get(
    '/health',
    { config: { rateLimit: false } },
    async () => ({ status: 'ok', service: 'terramorph-api', timestamp: new Date().toISOString() }),
  )

  /* ---------- auth ---------- */

  app.post('/api/v1/auth/login', async (request, reply) => {
    const { email, password } = loginSchema.parse(request.body)
    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
      include: { memberships: { include: { workspace: true }, orderBy: { workspaceId: 'asc' } } },
    })

    // Identical failure for unknown email and wrong password so the response
    // cannot be used to enumerate registered accounts.
    const invalid = new AppError(401, 'Email or password is incorrect', 'INVALID_CREDENTIALS')
    if (!user?.passwordHash) throw invalid
    if (!(await verifyPassword(password, user.passwordHash))) throw invalid

    const membership = user.memberships[0]
    if (!membership) throw new AppError(403, 'Your account has no workspace access', 'NO_WORKSPACE')

    const { token, expiresAt } = await createSession(user.id, membership.workspaceId)
    setSessionCookie(reply, token, expiresAt)

    return reply.send({
      user: { id: user.id, name: user.name, email: user.email },
      workspace: { id: membership.workspaceId, name: membership.workspace.name, slug: membership.workspace.slug },
      role: membership.role,
      expiresAt: expiresAt.toISOString(),
    })
  })

  app.post('/api/v1/auth/logout', async (request, reply) => {
    const token = request.cookies[SESSION_COOKIE]
    if (token) await destroySession(token)
    clearSessionCookie(reply)
    return reply.status(204).send()
  })

  app.get('/api/v1/auth/me', { preHandler: requireAuth }, async (request, reply) => {
    const principal = principalOf(request)
    return reply.send({
      user: { id: principal.userId, name: principal.name, email: principal.email },
      workspace: { id: principal.workspaceId, slug: principal.workspaceSlug },
      role: principal.role,
    })
  })

  /* ---------- dashboard ---------- */

  app.get('/api/v1/dashboard/summary', { preHandler: requireAuth }, async (request, reply) => {
    const { workspaceId } = principalOf(request)
    // Every aggregate is scoped to the caller's workspace.
    const scope = { workspaceId }
    const [total, grouped, byStage, value, expertsOnRoster, notesReceived, generatedAt] = await Promise.all([
      prisma.assignment.count({ where: scope }),
      prisma.assignment.groupBy({ by: ['status'], where: scope, _count: { _all: true } }),
      prisma.assignment.groupBy({ by: ['stage'], where: scope, _count: { _all: true } }),
      prisma.assignment.aggregate({ where: scope, _sum: { value: true } }),
      // Experts are rostered people, not dashboard users.
      prisma.expert.count({ where: scope }),
      prisma.activityLog.count({ where: { workspaceId, type: 'NOTE_ADDED' } }),
      prisma.assignment.findFirst({ where: scope, orderBy: { updatedAt: 'desc' }, select: { updatedAt: true } }),
    ])
    const verified = await prisma.assignment.count({ where: { workspaceId, stage: { in: ['G6', 'G7'] } } })
    return reply.send({
      activeAssignments: total,
      contractValue: value._sum.value ?? 0,
      expertsOnRoster,
      outcomesVerified: total ? Math.round((verified / total) * 100) : 0,
      notesReceived,
      statuses: Object.fromEntries(grouped.map((item) => [item.status, item._count._all])),
      stages: Object.fromEntries(byStage.map((item) => [item.stage, item._count._all])),
      // Lets the UI show when the figures were last recalculated.
      generatedAt: generatedAt?.updatedAt.toISOString() ?? new Date().toISOString(),
    })
  })

  /* ---------- assignments ---------- */

  app.get('/api/v1/assignments', { preHandler: requireAuth }, async (request, reply) => {
    const query = listQuerySchema.parse(request.query)
    const { workspaceId } = principalOf(request)
    const where = {
      workspaceId,
      ...(query.status ? { status: query.status } : {}),
      ...(query.search
        ? {
            OR: [
              { id: { contains: query.search, mode: 'insensitive' as const } },
              { name: { contains: query.search, mode: 'insensitive' as const } },
              { client: { contains: query.search, mode: 'insensitive' as const } },
              { sector: { contains: query.search, mode: 'insensitive' as const } },
            ],
          }
        : {}),
    }
    const [items, total] = await Promise.all([
      prisma.assignment.findMany({
        where,
        select: assignmentSelect,
        orderBy: { updatedAt: 'desc' },
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
      }),
      prisma.assignment.count({ where }),
    ])
    return reply.send({
      items,
      pagination: { page: query.page, pageSize: query.pageSize, total, totalPages: Math.max(1, Math.ceil(total / query.pageSize)) },
    })
  })

  app.get('/api/v1/assignments/:id', { preHandler: requireAuth }, async (request, reply) => {
    const { id } = idSchema.parse(request.params)
    const { workspaceId } = principalOf(request)
    const assignment = await prisma.assignment.findFirst({
      // Scoping by workspace here is what stops one tenant reading another's work.
      where: { id, workspaceId },
      select: {
        ...assignmentSelect,
        activities: {
          orderBy: { createdAt: 'desc' },
          take: 50,
          select: { id: true, type: true, message: true, metadata: true, createdAt: true, user: { select: { id: true, name: true } } },
        },
      },
    })
    // Returned as 404 rather than 403 so ids cannot be probed across tenants.
    if (!assignment) throw new AppError(404, 'Assignment not found', 'NOT_FOUND')
    return reply.send(assignment)
  })

  /* ---------- experts ---------- */

  app.get('/api/v1/experts', { preHandler: requireAuth }, async (request, reply) => {
    const query = listQuerySchema.parse(request.query)
    const { workspaceId } = principalOf(request)
    const where = {
      workspaceId,
      ...(query.status ? { status: query.status as 'REGISTERED' | 'PROFILE_COMPLETE' | 'VETTED' | 'MATCHED' | 'DEPLOYED' | 'REJECTED' } : {}),
      ...(query.search
        ? {
            OR: [
              { name: { contains: query.search, mode: 'insensitive' as const } },
              { email: { contains: query.search, mode: 'insensitive' as const } },
              { sector: { contains: query.search, mode: 'insensitive' as const } },
            ],
          }
        : {}),
    }
    const [items, total] = await Promise.all([
      prisma.expert.findMany({ where, orderBy: { registeredAt: 'desc' }, skip: (query.page - 1) * query.pageSize, take: query.pageSize }),
      prisma.expert.count({ where }),
    ])
    return reply.send({
      items,
      pagination: { page: query.page, pageSize: query.pageSize, total, totalPages: Math.max(1, Math.ceil(total / query.pageSize)) },
    })
  })

  /* ---------- activity feed ---------- */

  app.get('/api/v1/activity', { preHandler: requireAuth }, async (request, reply) => {
    const { limit, before } = feedQuerySchema.parse(request.query)
    const { workspaceId } = principalOf(request)
    const items = await prisma.activityLog.findMany({
      where: {
        workspaceId,
        ...(before ? { createdAt: { lt: new Date(before) } } : {}),
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
      select: {
        id: true,
        type: true,
        message: true,
        metadata: true,
        createdAt: true,
        user: { select: { id: true, name: true } },
        assignment: { select: { id: true, name: true } },
      },
    })
    return reply.send({
      items,
      // Cursor for the next page; null when the page came back short.
      nextCursor: items.length === limit ? items[items.length - 1]!.createdAt.toISOString() : null,
    })
  })

  /* ---------- helpers ---------- */

  app.post('/api/v1/auth/password', { preHandler: requireAuth }, async (request, reply) => {
    const principal = principalOf(request)
    const body = z.object({ currentPassword: z.string().min(1), newPassword: z.string().min(12).max(200) }).parse(request.body)
    const user = await prisma.user.findUnique({ where: { id: principal.userId } })
    if (!user?.passwordHash) throw new AppError(400, 'This account has no password set', 'NO_PASSWORD')
    if (!(await verifyPassword(body.currentPassword, user.passwordHash))) {
      throw new AppError(403, 'Current password is incorrect', 'INVALID_CREDENTIALS')
    }
    await prisma.user.update({ where: { id: user.id }, data: { passwordHash: await hashPassword(body.newPassword) } })
    // Force other devices to sign in again.
    await prisma.session.deleteMany({ where: { userId: user.id } })
    clearSessionCookie(reply)
    return reply.status(204).send()
  })
}