import { prisma } from '../../db/prisma.js'
import { AppError } from '../errors.js'
import { assignmentSelect } from './assignment.select.js'

export type AssignmentListInput = {
  workspaceId: string
  status?: 'ON_TRACK' | 'AT_RISK' | 'BLOCKED'
  search?: string
  page: number
  pageSize: number
}

export async function listAssignments(input: AssignmentListInput) {
  const { workspaceId, status, search, page, pageSize } = input
  const where = {
    workspaceId,
    ...(status ? { status } : {}),
    ...(search
      ? {
          OR: [
            { id: { contains: search, mode: 'insensitive' as const } },
            { name: { contains: search, mode: 'insensitive' as const } },
            { client: { contains: search, mode: 'insensitive' as const } },
            { sector: { contains: search, mode: 'insensitive' as const } },
          ],
        }
      : {}),
  }
  const [items, total] = await Promise.all([
    prisma.assignment.findMany({
      where,
      select: assignmentSelect,
      orderBy: { updatedAt: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.assignment.count({ where }),
  ])
  return {
    items,
    pagination: { page, pageSize, total, totalPages: Math.max(1, Math.ceil(total / pageSize)) },
  }
}

export async function getAssignment(workspaceId: string, id: string) {
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
  return assignment
}