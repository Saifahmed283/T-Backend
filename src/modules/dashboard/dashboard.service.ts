import { prisma } from '../../db/prisma.js'

export async function getDashboardSummary(workspaceId: string) {
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
  return {
    activeAssignments: total,
    contractValue: value._sum.value ?? 0,
    expertsOnRoster,
    outcomesVerified: total ? Math.round((verified / total) * 100) : 0,
    notesReceived,
    statuses: Object.fromEntries(grouped.map((item) => [item.status, item._count._all])),
    stages: Object.fromEntries(byStage.map((item) => [item.stage, item._count._all])),
    // Lets the UI show when the figures were last recalculated.
    generatedAt: generatedAt?.updatedAt.toISOString() ?? new Date().toISOString(),
  }
}