import { prisma } from '../../db/prisma.js'
import { AppError } from '../errors.js'
import { hashPassword } from '../../security/passwords.js'
import { randomBytes } from 'node:crypto'

export const MEMBER_ROLES = ['admin', 'lead', 'member'] as const
export type MemberRole = (typeof MEMBER_ROLES)[number]

export interface Member {
  userId: string
  name: string
  email: string
  joinedAt: string
  role: MemberRole
  suspendedAt?: string | null
}

export async function listMembers(workspaceId: string) {
  const members = await prisma.workspaceMember.findMany({
    where: { workspaceId },
    orderBy: [{ role: 'asc' }, { userId: 'asc' }],
    select: {
      role: true,
      suspendedAt: true,
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
      suspendedAt: member.suspendedAt?.toISOString() ?? null,
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
    throw new AppError(409, 'You cannot demote your own account', 'SELF_DEMOTION_BLOCKED')
  }
  const membership = await prisma.workspaceMember.findUnique({
    where: { workspaceId_userId: { workspaceId: input.workspaceId, userId: input.userId } },
    select: { role: true },
  })
  if (!membership) throw new AppError(404, 'Member not found', 'MEMBER_NOT_FOUND')

  if (membership.role === 'admin' && input.role !== 'admin') {
    const admins = await prisma.workspaceMember.count({ where: { workspaceId: input.workspaceId, role: 'admin' } })
    if (admins <= 1) throw new AppError(409, 'At least one admin must remain', 'LAST_ADMIN')
  }

  return prisma.$transaction(async (tx) => {
    const updated = await tx.workspaceMember.update({
      where: { workspaceId_userId: { workspaceId: input.workspaceId, userId: input.userId } },
      data: { role: input.role },
      select: { role: true, user: { select: { id: true, name: true, email: true } } },
    })
    await tx.activityLog.create({
      data: {
        workspaceId: input.workspaceId,
        type: 'MEMBER_ROLE_CHANGED',
        message: `Changed ${updated.user.name}'s role from ${membership.role} to ${input.role}`,
        userId: input.actorUserId,
        metadata: { userId: updated.user.id, from: membership.role, to: input.role },
      },
    })
    return updated
  })
}

export async function updateMemberInfo(input: {
  workspaceId: string
  userId: string
  name: string
  email: string
  actorUserId: string
}) {
  if (input.userId === input.actorUserId) {
    throw new AppError(409, 'You cannot edit your own account', 'SELF_EDIT_BLOCKED')
  }
  const membership = await prisma.workspaceMember.findUnique({
    where: { workspaceId_userId: { workspaceId: input.workspaceId, userId: input.userId } },
    select: { role: true, user: { select: { email: true } } },
  })
  if (!membership) throw new AppError(404, 'Member not found', 'MEMBER_NOT_FOUND')

  // Check email uniqueness within workspace
  const existing = await prisma.user.findUnique({ where: { email: input.email } })
  if (existing && existing.id !== input.userId) {
    // Check if that user is already a member of this workspace
    const existingMembership = await prisma.workspaceMember.findUnique({
      where: { workspaceId_userId: { workspaceId: input.workspaceId, userId: existing.id } },
    })
    if (existingMembership) {
      throw new AppError(409, 'Email already in use by another member', 'EMAIL_IN_USE')
    }
  }

  return prisma.$transaction(async (tx) => {
    const updated = await tx.user.update({
      where: { id: input.userId },
      data: { name: input.name, email: input.email },
      select: { id: true, name: true, email: true },
    })
    await tx.activityLog.create({
      data: {
        workspaceId: input.workspaceId,
        type: 'MEMBER_INFO_UPDATED',
        message: `Updated ${updated.name}'s information`,
        userId: input.actorUserId,
        metadata: { userId: updated.id },
      },
    })
    return updated
  })
}

export async function suspendMember(input: {
  workspaceId: string
  userId: string
  actorUserId: string
}) {
  if (input.userId === input.actorUserId) {
    throw new AppError(409, 'You cannot suspend yourself', 'SELF_SUSPEND_BLOCKED')
  }
  const membership = await prisma.workspaceMember.findUnique({
    where: { workspaceId_userId: { workspaceId: input.workspaceId, userId: input.userId } },
    select: { role: true, suspendedAt: true, user: { select: { name: true, email: true } } },
  })
  if (!membership) throw new AppError(404, 'Member not found', 'MEMBER_NOT_FOUND')
  if (membership.suspendedAt) throw new AppError(409, 'Member is already suspended', 'ALREADY_SUSPENDED')

  return prisma.$transaction(async (tx) => {
    const updated = await tx.workspaceMember.update({
      where: { workspaceId_userId: { workspaceId: input.workspaceId, userId: input.userId } },
      data: { suspendedAt: new Date() },
      select: { userId: true, suspendedAt: true, user: { select: { name: true, email: true } } },
    })
    // Revoke all sessions for the suspended user in this workspace
    await tx.session.deleteMany({
      where: { userId: input.userId, activeWorkspaceId: input.workspaceId },
    })
    await tx.activityLog.create({
      data: {
        workspaceId: input.workspaceId,
        type: 'MEMBER_SUSPENDED',
        message: `Suspended ${membership.user.name}`,
        userId: input.actorUserId,
        metadata: { userId: updated.userId },
      },
    })
    return { userId: updated.userId, suspendedAt: updated.suspendedAt }
  })
}

export async function resumeMember(input: {
  workspaceId: string
  userId: string
  actorUserId: string
}) {
  const membership = await prisma.workspaceMember.findUnique({
    where: { workspaceId_userId: { workspaceId: input.workspaceId, userId: input.userId } },
    select: { suspendedAt: true, user: { select: { name: true } } },
  })
  if (!membership) throw new AppError(404, 'Member not found', 'MEMBER_NOT_FOUND')
  if (!membership.suspendedAt) throw new AppError(409, 'Member is not suspended', 'NOT_SUSPENDED')

  return prisma.$transaction(async (tx) => {
    const updated = await tx.workspaceMember.update({
      where: { workspaceId_userId: { workspaceId: input.workspaceId, userId: input.userId } },
      data: { suspendedAt: null },
      select: { userId: true, suspendedAt: true },
    })
    await tx.activityLog.create({
      data: {
        workspaceId: input.workspaceId,
        type: 'MEMBER_RESUMED',
        message: `Resumed ${membership.user.name}`,
        userId: input.actorUserId,
        metadata: { userId: updated.userId },
      },
    })
    return { userId: updated.userId, suspendedAt: updated.suspendedAt }
  })
}

export async function deleteMember(input: {
  workspaceId: string
  userId: string
  actorUserId: string
}) {
  if (input.userId === input.actorUserId) {
    throw new AppError(409, 'You cannot delete yourself', 'SELF_DELETE_BLOCKED')
  }
  const membership = await prisma.workspaceMember.findUnique({
    where: { workspaceId_userId: { workspaceId: input.workspaceId, userId: input.userId } },
    select: { role: true, user: { select: { name: true, email: true } } },
  })
  if (!membership) throw new AppError(404, 'Member not found', 'MEMBER_NOT_FOUND')

  if (membership.role === 'admin') {
    const admins = await prisma.workspaceMember.count({ where: { workspaceId: input.workspaceId, role: 'admin' } })
    if (admins <= 1) throw new AppError(409, 'At least one admin must remain', 'LAST_ADMIN')
  }

  return prisma.$transaction(async (tx) => {
    await tx.workspaceMember.delete({
      where: { workspaceId_userId: { workspaceId: input.workspaceId, userId: input.userId } },
    })
    // Revoke all sessions for the deleted user in this workspace
    await tx.session.deleteMany({
      where: { userId: input.userId, activeWorkspaceId: input.workspaceId },
    })
    await tx.activityLog.create({
      data: {
        workspaceId: input.workspaceId,
        type: 'MEMBER_DELETED',
        message: `Deleted ${membership.user.name}`,
        userId: input.actorUserId,
        metadata: { userId: input.userId, email: membership.user.email },
      },
    })
    return { deleted: true }
  })
}

export async function inviteMember(input: {
  workspaceId: string
  email: string
  name: string
  role: MemberRole
  actorUserId: string
}) {
  // Check if user already exists
  let user = await prisma.user.findUnique({ where: { email: input.email } })
  let tempPassword: string | null = null

  if (!user) {
    // Generate a temporary password (16 chars, URL-safe)
    tempPassword = randomBytes(12).toString('base64url')
    const passwordHash = await hashPassword(tempPassword)
    user = await prisma.user.create({
      data: { email: input.email, name: input.name, passwordHash },
    })
  } else {
    // User exists - check if already a member
    const existingMembership = await prisma.workspaceMember.findUnique({
      where: { workspaceId_userId: { workspaceId: input.workspaceId, userId: user.id } },
    })
    if (existingMembership) {
      throw new AppError(409, 'User is already a member of this workspace', 'ALREADY_MEMBER')
    }
  }

  return prisma.$transaction(async (tx) => {
    const membership = await tx.workspaceMember.create({
      data: { workspaceId: input.workspaceId, userId: user.id, role: input.role },
      select: { role: true, user: { select: { id: true, name: true, email: true } } },
    })
    await tx.activityLog.create({
      data: {
        workspaceId: input.workspaceId,
        type: 'MEMBER_INVITED',
        message: `Invited ${membership.user.name} as ${input.role}`,
        userId: input.actorUserId,
        metadata: { userId: membership.user.id, role: input.role },
      },
    })
    return { ...membership, tempPassword }
  })
}