import { Prisma } from '@prisma/client'
import { prisma } from '../../db/prisma.js'

// Website configuration is a single per-workspace JSON document: contact, legal
// identity, social links, default SEO, homepage hero and navigation order.
export async function getSiteSettings(workspaceId: string) {
  const existing = await prisma.siteSetting.findUnique({ where: { workspaceId }, select: { data: true, updatedAt: true } })
  return {
    data: (existing?.data ?? {}) as Record<string, unknown>,
    updatedAt: existing?.updatedAt?.toISOString() ?? null,
  }
}

export async function updateSiteSettings(workspaceId: string, data: Record<string, unknown>, userId: string) {
  const setting = await prisma.siteSetting.upsert({
    where: { workspaceId },
    update: { data: data as Prisma.InputJsonValue },
    create: { workspaceId, data: data as Prisma.InputJsonValue },
    select: { data: true, updatedAt: true },
  })
  await prisma.activityLog.create({
    data: {
      workspaceId,
      type: 'CONTENT_UPDATED',
      message: 'Updated website settings',
      userId,
      metadata: { scope: 'site-settings' },
    },
  })
  return { data: setting.data as Record<string, unknown>, updatedAt: setting.updatedAt.toISOString() }
}
