import { Prisma } from '../../generated/prisma/client.js'
import { prisma } from '../../db/prisma.js'
import { AppError } from '../errors.js'
import { collectionById, collectionIdByKind, kindForCollectionId } from './content.registry.js'

// The editorial workflow, enforced on the server. Keys are the current status;
// each value lists the statuses it may move to.
export const TRANSITIONS: Record<string, string[]> = {
  DRAFT: ['REVIEW', 'PUBLISHED', 'ARCHIVED'],
  REVIEW: ['APPROVED', 'DRAFT', 'ARCHIVED'],
  APPROVED: ['PUBLISHED', 'SCHEDULED', 'DRAFT', 'ARCHIVED'],
  SCHEDULED: ['PUBLISHED', 'DRAFT', 'ARCHIVED'],
  PUBLISHED: ['UNPUBLISHED', 'ARCHIVED'],
  UNPUBLISHED: ['PUBLISHED', 'DRAFT', 'ARCHIVED'],
  ARCHIVED: ['DRAFT'],
}

// Moving a record into any of these states is an approver action.
const APPROVER_TARGETS = new Set(['APPROVED', 'SCHEDULED', 'PUBLISHED', 'UNPUBLISHED', 'ARCHIVED'])
const APPROVER_ROLES = new Set(['admin', 'lead'])

export const ALL_STATUSES = ['DRAFT', 'REVIEW', 'APPROVED', 'SCHEDULED', 'PUBLISHED', 'UNPUBLISHED', 'ARCHIVED'] as const

export class ContentServiceError extends AppError {}

function toKind(collectionId: string): string {
  const kind = kindForCollectionId(collectionId)
  if (!kind) throw new AppError(404, `Unknown collection "${collectionId}"`, 'NOT_FOUND')
  return kind
}

export function slugify(input: string): string {
  return input
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80)
}

// A stored value looks like { en?: string, ar?: string }. Trim, drop empties.
function cleanLocalizedValue(value: unknown): { en?: string; ar?: string } | undefined {
  if (!value || typeof value !== 'object') return undefined
  const source = value as Record<string, unknown>
  const out: { en?: string; ar?: string } = {}
  if (typeof source.en === 'string' && source.en.trim() !== '') out.en = source.en.trim()
  if (typeof source.ar === 'string' && source.ar.trim() !== '') out.ar = source.ar.trim()
  return out.en === undefined && out.ar === undefined ? undefined : out
}

// Keep only fields the collection declares, so the JSON payload cannot grow
// arbitrary keys. Localized fields accept { en, ar }; others take the raw value.
export function normalizeData(collectionId: string, input: unknown): Record<string, unknown> {
  const collection = collectionById(collectionId)
  if (!collection) throw new AppError(404, `Unknown collection "${collectionId}"`, 'NOT_FOUND')
  const source = (input ?? {}) as Record<string, unknown>
  const data: Record<string, unknown> = {}
  for (const field of collection.fields) {
    const raw = source[field.key]
    if (raw === undefined || raw === null) continue
    if (field.localized) {
      const cleaned = cleanLocalizedValue(raw)
      if (cleaned) data[field.key] = cleaned
    } else if (typeof raw === 'string') {
      const trimmed = raw.trim()
      if (trimmed !== '') data[field.key] = trimmed
    } else if (typeof raw === 'number') {
      data[field.key] = raw
    }
  }
  return data
}

export function deriveTitle(data: Record<string, unknown>, fallback = 'Untitled'): string {
  const title = data.title as unknown
  if (title && typeof title === 'object') {
    const localized = title as { en?: string; ar?: string }
    return localized.en ?? localized.ar ?? fallback
  }
  if (typeof title === 'string' && title.trim()) return title.trim()
  return fallback
}

// Publishing demands every required field be present in English. Drafts are
// allowed to be incomplete so the editor can save progress.
export function requiredFieldsMissing(collectionId: string, data: Record<string, unknown>): string[] {
  const collection = collectionById(collectionId)
  if (!collection) return []
  const missing: string[] = []
  for (const field of collection.fields) {
    if (!field.required) continue
    const value = data[field.key]
    if (field.localized) {
      const localized = value as { en?: string } | undefined
      if (!localized || !localized.en) missing.push(field.label)
    } else if (value === undefined || value === null || String(value).trim() === '') {
      missing.push(field.label)
    }
  }
  return missing
}

async function logActivity(input: {
  workspaceId: string
  type: 'CONTENT_CREATED' | 'CONTENT_UPDATED' | 'CONTENT_STATUS_CHANGED'
  message: string
  contentItemId: string
  userId: string
  metadata?: Prisma.InputJsonValue
}) {
  await prisma.activityLog.create({
    data: {
      workspaceId: input.workspaceId,
      type: input.type,
      message: input.message,
      contentItemId: input.contentItemId,
      userId: input.userId,
      ...(input.metadata ? { metadata: input.metadata } : {}),
    },
  })
}

export const contentSelect = {
  id: true,
  kind: true,
  status: true,
  slug: true,
  title: true,
  data: true,
  seo: true,
  assignmentId: true,
  sourceReference: true,
  scheduledPublishAt: true,
  scheduledUnpublishAt: true,
  publishedAt: true,
  createdById: true,
  updatedById: true,
  createdAt: true,
  updatedAt: true,
} as const

export type ContentListInput = {
  workspaceId: string
  collectionId: string
  status?: string
  search?: string
  page: number
  pageSize: number
}

export async function listContent(input: ContentListInput) {
  const { workspaceId, collectionId, status, search, page, pageSize } = input
  const kind = toKind(collectionId)
  const where: Prisma.ContentItemWhereInput = {
    workspaceId,
    kind: kind as never,
    ...(status ? { status: status as never } : {}),
    ...(search
      ? {
          OR: [
            { title: { contains: search, mode: 'insensitive' } },
            { slug: { contains: search, mode: 'insensitive' } },
          ],
        }
      : {}),
  }
  const [items, total] = await Promise.all([
    prisma.contentItem.findMany({
      where,
      select: contentSelect,
      orderBy: { updatedAt: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.contentItem.count({ where }),
  ])
  return {
    items,
    pagination: { page, pageSize, total, totalPages: Math.max(1, Math.ceil(total / pageSize)) },
  }
}

export async function getContent(workspaceId: string, id: string) {
  const item = await prisma.contentItem.findFirst({
    where: { id, workspaceId },
    select: {
      ...contentSelect,
      activities: {
        orderBy: { createdAt: 'desc' },
        take: 50,
        select: { id: true, type: true, message: true, metadata: true, createdAt: true, user: { select: { id: true, name: true } } },
      },
    },
  })
  if (!item) throw new AppError(404, 'Content not found', 'NOT_FOUND')
  return item
}

export type CreateContentInput = {
  workspaceId: string
  collectionId: string
  userId: string
  data: unknown
  seo?: unknown
  slug?: string
  assignmentId?: string
  sourceReference?: string
}

export async function createContent(input: CreateContentInput) {
  const kind = toKind(input.collectionId)
  const data = normalizeData(input.collectionId, input.data)
  const title = deriveTitle(data)
  let slug = slugify(input.slug || title)
  if (!slug) slug = `untitled-${Date.now().toString(36)}`

  // Resolve unique slug within (workspace, kind).
  let candidate = slug
  for (let attempt = 0; attempt < 50; attempt += 1) {
    const clash = await prisma.contentItem.findFirst({
      where: { workspaceId: input.workspaceId, kind: kind as never, slug: candidate },
      select: { id: true },
    })
    if (!clash) break
    candidate = `${slug}-${attempt + 2}`
  }

  const item = await prisma.contentItem.create({
    data: {
      workspaceId: input.workspaceId,
      kind: kind as never,
      status: 'DRAFT',
      slug: candidate,
      title,
      data: data as Prisma.InputJsonValue,
      ...(input.seo ? { seo: input.seo as Prisma.InputJsonValue } : {}),
      ...(input.assignmentId ? { assignmentId: input.assignmentId } : {}),
      ...(input.sourceReference ? { sourceReference: input.sourceReference } : {}),
      createdById: input.userId,
      updatedById: input.userId,
    },
    select: contentSelect,
  })
  await logActivity({
    workspaceId: input.workspaceId,
    type: 'CONTENT_CREATED',
    message: `Created ${input.collectionId} draft "${title}"`,
    contentItemId: item.id,
    userId: input.userId,
    metadata: { kind, collectionId: input.collectionId },
  })
  return item
}

export type UpdateContentInput = {
  workspaceId: string
  id: string
  userId: string
  data?: unknown
  seo?: unknown
  slug?: string
  assignmentId?: string | null
  sourceReference?: string | null
  scheduledPublishAt?: string | null
  scheduledUnpublishAt?: string | null
}

export async function updateContent(input: UpdateContentInput) {
  const existing = await prisma.contentItem.findFirst({ where: { id: input.id, workspaceId: input.workspaceId } })
  if (!existing) throw new AppError(404, 'Content not found', 'NOT_FOUND')
  const collectionId = collectionIdFromKind(existing.kind)
  if (!collectionId) throw new AppError(500, 'Stored content kind is not recognised', 'INTERNAL_ERROR')

  const update: Prisma.ContentItemUpdateInput = { updatedById: input.userId }
  if (input.data !== undefined) {
    const data = normalizeData(collectionId, input.data)
    update.data = data as Prisma.InputJsonValue
    update.title = deriveTitle(data)
  }
  if (input.seo !== undefined) update.seo = (input.seo ?? Prisma.JsonNull) as Prisma.InputJsonValue
  if (input.slug !== undefined) update.slug = slugify(input.slug) || existing.slug
  if (input.assignmentId !== undefined) update.assignment = input.assignmentId ? { connect: { id: input.assignmentId } } : { disconnect: true }
  if (input.sourceReference !== undefined) update.sourceReference = input.sourceReference
  if (input.scheduledPublishAt !== undefined) {
    update.scheduledPublishAt = input.scheduledPublishAt ? new Date(input.scheduledPublishAt) : null
  }
  if (input.scheduledUnpublishAt !== undefined) {
    update.scheduledUnpublishAt = input.scheduledUnpublishAt ? new Date(input.scheduledUnpublishAt) : null
  }

  const item = await prisma.contentItem.update({ where: { id: existing.id }, data: update, select: contentSelect })
  await logActivity({
    workspaceId: input.workspaceId,
    type: 'CONTENT_UPDATED',
    message: `Updated "${item.title}"`,
    contentItemId: item.id,
    userId: input.userId,
    metadata: { kind: item.kind, collectionId },
  })
  return item
}

export type TransitionInput = {
  workspaceId: string
  id: string
  userId: string
  role: string
  to: string
}

export async function transitionContent(input: TransitionInput) {
  const existing = await prisma.contentItem.findFirst({ where: { id: input.id, workspaceId: input.workspaceId } })
  if (!existing) throw new AppError(404, 'Content not found', 'NOT_FOUND')
  const to = input.to.toUpperCase()
  const allowed = TRANSITIONS[existing.status] ?? []
  if (!allowed.includes(to)) {
    throw new AppError(409, `Cannot move from ${existing.status} to ${to}`, 'INVALID_TRANSITION')
  }
  if (APPROVER_TARGETS.has(to) && !APPROVER_ROLES.has(input.role)) {
    throw new AppError(403, 'Only approvers may perform this action', 'FORBIDDEN')
  }

  const collectionId = collectionIdFromKind(existing.kind)
  if ((to === 'APPROVED' || to === 'PUBLISHED' || to === 'SCHEDULED') && collectionId) {
    const data = (existing.data ?? {}) as Record<string, unknown>
    const missing = requiredFieldsMissing(collectionId, data)
    if (missing.length > 0) {
      throw new AppError(422, `Missing required fields: ${missing.join(', ')}`, 'INCOMPLETE_CONTENT')
    }
  }

  const now = new Date()
  const update: Prisma.ContentItemUpdateInput = {
    status: to as never,
    updatedById: input.userId,
  }
  if (to === 'PUBLISHED') update.publishedAt = now
  if (to === 'DRAFT') {
    update.publishedAt = null
    update.scheduledPublishAt = null
  }

  const item = await prisma.contentItem.update({ where: { id: existing.id }, data: update, select: contentSelect })
  await logActivity({
    workspaceId: input.workspaceId,
    type: 'CONTENT_STATUS_CHANGED',
    message: `Moved "${item.title}" from ${existing.status} to ${to}`,
    contentItemId: item.id,
    userId: input.userId,
    metadata: { from: existing.status, to },
  })
  return item
}

export async function deleteContent(workspaceId: string, id: string, userId: string) {
  const existing = await prisma.contentItem.findFirst({ where: { id, workspaceId } })
  if (!existing) throw new AppError(404, 'Content not found', 'NOT_FOUND')
  await logActivity({
    workspaceId,
    type: 'CONTENT_UPDATED',
    message: `Deleted "${existing.title}"`,
    contentItemId: existing.id,
    userId,
    metadata: { kind: existing.kind, deleted: true },
  })
  await prisma.contentItem.delete({ where: { id: existing.id } })
  return { id, deleted: true }
}

export async function contentCounts(workspaceId: string) {
  const grouped = await prisma.contentItem.groupBy({
    by: ['kind', 'status'],
    where: { workspaceId },
    _count: { _all: true },
  })
  const byStatus: Record<string, number> = Object.fromEntries(ALL_STATUSES.map((status) => [status, 0]))
  const byKind: Record<string, { total: number; byStatus: Record<string, number> }> = {}
  let total = 0
  for (const row of grouped) {
    const count = row._count._all
    total += count
    byStatus[row.status] = (byStatus[row.status] ?? 0) + count
    const collectionId = collectionIdFromKind(row.kind) ?? row.kind
    if (!byKind[collectionId]) {
      byKind[collectionId] = { total: 0, byStatus: Object.fromEntries(ALL_STATUSES.map((s) => [s, 0])) }
    }
    byKind[collectionId].total += count
    byKind[collectionId].byStatus[row.status] = count
  }
  return { total, byStatus, byKind, generatedAt: new Date().toISOString() }
}

export async function workflowBoard(workspaceId: string, perColumn = 50) {
  const columns: Record<string, unknown[]> = {}
  for (const status of ALL_STATUSES) {
    columns[status] = await prisma.contentItem.findMany({
      where: { workspaceId, status: status as never },
      select: contentSelect,
      orderBy: { updatedAt: 'desc' },
      take: perColumn,
    })
  }
  return { columns, generatedAt: new Date().toISOString() }
}

// --- Public (unauthenticated) read model -----------------------------------
// The marketing site reads only PUBLISHED rows of the public workspace, after
// publishedAt has passed and before any scheduled unpublish. Fields flagged
// `internal` in the registry are stripped before a row leaves the API.

function publishedWhere(now: Date): Prisma.ContentItemWhereInput {
  return {
    status: 'PUBLISHED',
    publishedAt: { not: null, lte: now },
    OR: [{ scheduledUnpublishAt: null }, { scheduledUnpublishAt: { gt: now } }],
  }
}

const publicSelect = {
  kind: true,
  slug: true,
  title: true,
  data: true,
  seo: true,
  publishedAt: true,
  updatedAt: true,
} as const

function stripInternal(kind: string, data: unknown): Record<string, unknown> {
  const source = (data ?? {}) as Record<string, unknown>
  const collectionId = collectionIdByKind[kind]
  const collection = collectionId ? collectionById(collectionId) : undefined
  if (!collection) return source
  const internal = new Set(collection.fields.filter((field) => field.internal).map((field) => field.key))
  const out: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(source)) {
    if (internal.has(key)) continue
    out[key] = value
  }
  return out
}

function toPublicItem<T extends { kind: string; data: unknown }>(item: T) {
  return { ...item, collectionId: collectionIdByKind[item.kind] ?? null, data: stripInternal(item.kind, item.data) }
}

export type PublicListInput = {
  workspaceSlug: string
  collectionId: string
  search?: string
  page: number
  pageSize: number
}

export async function listPublicContent(input: PublicListInput) {
  const kind = toKind(input.collectionId)
  const and: Prisma.ContentItemWhereInput[] = [publishedWhere(new Date())]
  if (input.search) {
    and.push({
      OR: [
        { title: { contains: input.search, mode: 'insensitive' } },
        { slug: { contains: input.search, mode: 'insensitive' } },
      ],
    })
  }
  const where: Prisma.ContentItemWhereInput = {
    kind: kind as never,
    workspace: { slug: input.workspaceSlug },
    AND: and,
  }
  const [rows, total] = await prisma.$transaction([
    prisma.contentItem.findMany({
      where,
      select: publicSelect,
      orderBy: { publishedAt: 'desc' },
      skip: (input.page - 1) * input.pageSize,
      take: input.pageSize,
    }),
    prisma.contentItem.count({ where }),
  ])
  return {
    collectionId: input.collectionId,
    items: rows.map(toPublicItem),
    total,
    page: input.page,
    pageSize: input.pageSize,
  }
}

export async function getPublicContent(workspaceSlug: string, collectionId: string, slug: string) {
  const kind = toKind(collectionId)
  const item = await prisma.contentItem.findFirst({
    where: { kind: kind as never, slug, workspace: { slug: workspaceSlug }, ...publishedWhere(new Date()) },
    select: publicSelect,
  })
  return item ? toPublicItem(item) : null
}

export async function publicSlugs(workspaceSlug: string) {
  const rows = await prisma.contentItem.findMany({
    where: { workspace: { slug: workspaceSlug }, ...publishedWhere(new Date()) },
    select: { kind: true, slug: true },
    orderBy: [{ kind: 'asc' }, { slug: 'asc' }],
  })
  const collections: Record<string, string[]> = {}
  for (const row of rows) {
    const collectionId = collectionIdByKind[row.kind] ?? row.kind
    const bucket = collections[collectionId] ?? []
    bucket.push(row.slug)
    collections[collectionId] = bucket
  }
  return { collections }
}

export async function publicSiteSettings(workspaceSlug: string) {
  const workspace = await prisma.workspace.findUnique({
    where: { slug: workspaceSlug },
    select: { siteSetting: { select: { data: true, updatedAt: true } } },
  })
  return workspace?.siteSetting ? workspace.siteSetting.data : {}
}

function collectionIdFromKind(kind: string): string | undefined {
  return collectionIdByKind[kind]
}
