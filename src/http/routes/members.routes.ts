import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { MEMBER_ROLES, listMembers, updateMemberRole } from '../../modules/members/members.service.js'
import { principalOf, requireAuth, requireRole } from '../middleware/requireAuth.js'

const memberParamsSchema = z.object({ userId: z.string().min(1).max(50) })
const roleBodySchema = z.object({ role: z.enum(MEMBER_ROLES) }).strict()

export async function registerMemberRoutes(app: FastifyInstance) {
  app.get('/api/v1/members', { preHandler: requireAuth }, async (request, reply) => {
    const { workspaceId } = principalOf(request)
    return reply.send(await listMembers(workspaceId))
  })

  app.patch('/api/v1/members/:userId', { preHandler: [requireAuth, requireRole('admin')] }, async (request, reply) => {
    const { userId } = memberParamsSchema.parse(request.params)
    const { role } = roleBodySchema.parse(request.body)
    const principal = principalOf(request)
    return reply.send(
      await updateMemberRole({
        workspaceId: principal.workspaceId,
        userId,
        role,
        actorUserId: principal.userId,
      }),
    )
  })
}
