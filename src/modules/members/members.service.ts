import { prisma } from '../../db/prisma.js'
import { AppError } from '../errors.js'

export const MEMBER_ROLES = ['admin', 'lead', 'member'] as const
export type MemberRole = (typeof MEMBER_ROLES)[number]

export async function listMembers(workspaceId: string) {
  const members = await prisma.workspaceMember.findMany({
    where: { workspaceId },
    orderBy: [{ role: 'asc' }, { userId: 'asc' }],
    select: {
      role: true,
      user: { select: { id: true, name: true, email: true, createdAt: true } },
    },
  })
  return {
    items: members.map((member) => ({
      userId: member.user.id,
      name: member.user.name,
      email: member.user.email,
      joinedAt: member.user.createdAt.toISOString(),
      role: member.role,
    })),
  }
}

export async function updateMemberRole(input: {
  workspaceId: string
  userId: string
  role: MemberRole
  actorUserId: string
}) {
  if (input.userId === input.actorUserId && input.role !== 'admin') {
    // Guard against an admin locking themselves out of administration.
    throw new AppError(409, 'You cannot demote your own account', 'SELF_DEMOTION_BLOCKED')
  }
  const membership = await prisma.workspaceMember.findUnique({
    where: { workspaceId_userId: { workspaceId: input.workspaceId, userId: input.userId } },
    select: { role: true },
  })
  if (!membership) throw new AppError(404, 'Member not found', 'NOT_FOUND')

  // Guard against removing the last admin.
  if (membership.role === 'admin' && input.role !== 'admin') {
    const admins = await prisma.workspaceMember.count({ where: { workspaceId: input.workspaceId, role: 'admin' } })
    if (admins <= 1) throw new AppError(409, 'At least one admin must remain', 'LAST_ADMIN')
  }

  return prisma.workspaceMember.update({
    where: { workspaceId_userId: { workspaceId: input.workspaceId, userId: input.userId } },
    data: { role: input.role },
    select: { role: true, user: { select: { id: true, name: true, email: true } } },
  })
}
