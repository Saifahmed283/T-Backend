import { prisma } from '../../db/prisma.js'

export async function getActivities(workspaceId: string, limit: number, before?: string) {
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
  return {
    items,
    // Cursor for the next page; null when the page came back short.
    nextCursor: items.length === limit ? items[items.length - 1]!.createdAt.toISOString() : null,
  }
}