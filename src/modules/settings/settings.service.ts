import type { Prisma } from '../../generated/prisma/client.js'
import { prisma } from '../../db/prisma.js'
import { invalidatePublicCache } from '../content/content-cache.js'
import { siteSettingsSchema, mergeWithDefaults, type SiteSettings } from './site-settings-schema.js'

// Website configuration is a single per-workspace JSON document: contact, legal
// identity, social links, default SEO, homepage hero and navigation order.
export async function getSiteSettings(workspaceId: string) {
  const existing = await prisma.siteSetting.findUnique({ where: { workspaceId }, select: { data: true, updatedAt: true } })
  const data = mergeWithDefaults((existing?.data ?? {}) as Partial<SiteSettings>)
  return {
    data,
    updatedAt: existing?.updatedAt?.toISOString() ?? null,
  }
}

export async function updateSiteSettings(workspaceId: string, data: Partial<SiteSettings>, userId: string) {
  const validated = siteSettingsSchema.parse(data)
  const merged = mergeWithDefaults(validated)

  const setting = await prisma.siteSetting.upsert({
    where: { workspaceId },
    update: { data: merged as Prisma.InputJsonValue },
    create: { workspaceId, data: merged as Prisma.InputJsonValue },
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
  await invalidatePublicCache()
  return { data: setting.data as SiteSettings, updatedAt: setting.updatedAt.toISOString() }
}

export async function publicSiteSettings(workspaceSlug: string): Promise<SiteSettings> {
  const setting = await prisma.siteSetting.findFirst({
    where: { workspace: { slug: workspaceSlug } },
    select: { data: true },
  })
  return mergeWithDefaults((setting?.data ?? {}) as Partial<SiteSettings>)
}