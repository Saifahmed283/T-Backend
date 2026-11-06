import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import {
  MEMBER_ROLES,
  listMembers,
  updateMemberRole,
  updateMemberInfo,
  suspendMember,
  resumeMember,
  deleteMember,
  inviteMember,
} from '../../modules/members/members.service.js'
import { principalOf, requireAuth, requireRole } from '../middleware/requireAuth.js'

const memberParamsSchema = z.object({ userId: z.string().min(1).max(50) })
const roleBodySchema = z.object({ role: z.enum(MEMBER_ROLES) }).strict()
const updateInfoBodySchema = z.object({ name: z.string().min(1).max(100), email: z.string().email() }).strict()
const inviteBodySchema = z.object({
  email: z.string().email(),
  name: z.string().min(1).max(100),
  role: z.enum(MEMBER_ROLES),
}).strict()

export async function registerMemberRoutes(app: FastifyInstance) {
  app.get('/api/v1/members', { preHandler: requireAuth }, async (request, reply) => {
    const { workspaceId } = principalOf(request)
    return reply.send(await listMembers(workspaceId))
  })

  app.patch('/api/v1/members/:userId', { preHandler: [requireAuth, requireRole('admin')] }, async (request, reply) => {
    const { userId } = memberParamsSchema.parse(request.params)
    const principal = principalOf(request)

    // Check if body contains role (role update) or name/email (info update)
    const body = request.body as Record<string, unknown>
    if ('role' in body) {
      const { role } = roleBodySchema.parse(body)
      return reply.send(
        await updateMemberRole({
          workspaceId: principal.workspaceId,
          userId,
          role,
          actorUserId: principal.userId,
        }),
      )
    } else {
      const { name, email } = updateInfoBodySchema.parse(body)
      return reply.send(
        await updateMemberInfo({
          workspaceId: principal.workspaceId,
          userId,
          name,
          email,
          actorUserId: principal.userId,
        }),
      )
    }
  })

  app.post('/api/v1/members/:userId/suspend', { preHandler: [requireAuth, requireRole('admin')] }, async (request, reply) => {
    const { userId } = memberParamsSchema.parse(request.params)
    const principal = principalOf(request)
    return reply.send(
      await suspendMember({
        workspaceId: principal.workspaceId,
        userId,
        actorUserId: principal.userId,
      }),
    )
  })

  app.post('/api/v1/members/:userId/resume', { preHandler: [requireAuth, requireRole('admin')] }, async (request, reply) => {
    const { userId } = memberParamsSchema.parse(request.params)
    const principal = principalOf(request)
    return reply.send(
      await resumeMember({
        workspaceId: principal.workspaceId,
        userId,
        actorUserId: principal.userId,
      }),
    )
  })

  app.delete('/api/v1/members/:userId', { preHandler: [requireAuth, requireRole('admin')] }, async (request, reply) => {
    const { userId } = memberParamsSchema.parse(request.params)
    const principal = principalOf(request)
    return reply.send(
      await deleteMember({
        workspaceId: principal.workspaceId,
        userId,
        actorUserId: principal.userId,
      }),
    )
  })

  app.post('/api/v1/members/invite', { preHandler: [requireAuth, requireRole('admin')] }, async (request, reply) => {
    const { email, name, role } = inviteBodySchema.parse(request.body)
    const principal = principalOf(request)
    return reply.send(
      await inviteMember({
        workspaceId: principal.workspaceId,
        email,
        name,
        role,
        actorUserId: principal.userId,
      }),
    )
  })
}