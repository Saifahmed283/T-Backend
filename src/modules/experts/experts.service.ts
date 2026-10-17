import { prisma } from '../../db/prisma.js'

export type ExpertStatus = 'REGISTERED' | 'PROFILE_COMPLETE' | 'VETTED' | 'MATCHED' | 'DEPLOYED' | 'REJECTED'

export type ExpertListInput = {
  workspaceId: string
  status?: ExpertStatus
  search?: string
  page: number
  pageSize: number
}

export async function listExperts(input: ExpertListInput) {
  const { workspaceId, status, search, page, pageSize } = input
  const where = {
    workspaceId,
    ...(status ? { status } : {}),
    ...(search
      ? {
          OR: [
            { name: { contains: search, mode: 'insensitive' as const } },
            { email: { contains: search, mode: 'insensitive' as const } },
            { sector: { contains: search, mode: 'insensitive' as const } },
          ],
        }
      : {}),
  }
  const [items, total] = await Promise.all([
    prisma.expert.findMany({ where, orderBy: { registeredAt: 'desc' }, skip: (page - 1) * pageSize, take: pageSize }),
    prisma.expert.count({ where }),
  ])
  return {
    items,
    pagination: { page, pageSize, total, totalPages: Math.max(1, Math.ceil(total / pageSize)) },
  }
}