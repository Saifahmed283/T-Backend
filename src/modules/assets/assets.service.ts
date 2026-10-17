import { randomUUID } from 'node:crypto'
import { Prisma } from '@prisma/client'
import { prisma } from '../../db/prisma.js'
import { AppError } from '../errors.js'
import { deleteObject, putObject, storageEnabled } from './storage.js'

// Whitelisted upload types. Kept deliberately small: the media library is for
// website imagery and documents, not arbitrary files.
export const ALLOWED_MIME_TYPES = [
  'image/png',
  'image/jpeg',
  'image/webp',
  'image/gif',
  'image/svg+xml',
  'application/pdf',
] as const

export const MAX_UPLOAD_BYTES = 15 * 1024 * 1024

export const assetSelect = {
  id: true,
  filename: true,
  url: true,
  storageKey: true,
  mimeType: true,
  size: true,
  alt: true,
  createdById: true,
  createdAt: true,
  updatedAt: true,
} as const

export type AssetListInput = {
  workspaceId: string
  search?: string
  mimeType?: string
  page: number
  pageSize: number
}

export async function listAssets(input: AssetListInput) {
  const where: Prisma.AssetWhereInput = {
    workspaceId: input.workspaceId,
    ...(input.mimeType ? { mimeType: input.mimeType } : {}),
    ...(input.search ? { filename: { contains: input.search, mode: 'insensitive' } } : {}),
  }
  const [items, total] = await Promise.all([
    prisma.asset.findMany({
      where,
      select: assetSelect,
      orderBy: { createdAt: 'desc' },
      skip: (input.page - 1) * input.pageSize,
      take: input.pageSize,
    }),
    prisma.asset.count({ where }),
  ])
  return {
    items,
    storageEnabled: storageEnabled(),
    pagination: { page: input.page, pageSize: input.pageSize, total, totalPages: Math.max(1, Math.ceil(total / input.pageSize)) },
  }
}

function safeFilename(filename: string): string {
  return filename
    .replace(/[^a-zA-Z0-9._-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 120) || 'file'
}

export type CreateAssetInput = {
  workspaceId: string
  userId: string
  filename: string
  mimeType: string
  buffer: Buffer
  alt?: { en?: string; ar?: string }
}

export async function createAsset(input: CreateAssetInput) {
  if (!storageEnabled()) {
    throw new AppError(503, 'Media storage is not configured', 'STORAGE_NOT_CONFIGURED')
  }
  if (!(ALLOWED_MIME_TYPES as readonly string[]).includes(input.mimeType)) {
    throw new AppError(415, `Unsupported file type "${input.mimeType}"`, 'UNSUPPORTED_MEDIA_TYPE')
  }
  if (input.buffer.byteLength > MAX_UPLOAD_BYTES) {
    throw new AppError(413, 'File exceeds the 15 MB limit', 'FILE_TOO_LARGE')
  }

  const key = `${input.workspaceId}/${randomUUID()}-${safeFilename(input.filename)}`
  const stored = await putObject({ key, body: input.buffer, contentType: input.mimeType })

  const asset = await prisma.asset.create({
    data: {
      workspaceId: input.workspaceId,
      filename: input.filename,
      storageKey: stored.key,
      url: stored.url,
      mimeType: input.mimeType,
      size: input.buffer.byteLength,
      ...(input.alt && (input.alt.en || input.alt.ar) ? { alt: input.alt as Prisma.InputJsonValue } : {}),
      createdById: input.userId,
    },
    select: assetSelect,
  })

  await prisma.activityLog.create({
    data: {
      workspaceId: input.workspaceId,
      type: 'ASSET_UPLOADED',
      message: `Uploaded ${input.filename}`,
      userId: input.userId,
      metadata: { assetId: asset.id, mimeType: input.mimeType },
    },
  })
  return asset
}

export async function updateAsset(workspaceId: string, id: string, alt: { en?: string; ar?: string } | null) {
  const existing = await prisma.asset.findFirst({ where: { id, workspaceId }, select: { id: true } })
  if (!existing) throw new AppError(404, 'Asset not found', 'NOT_FOUND')
  return prisma.asset.update({
    where: { id },
    data: { alt: alt ? (alt as Prisma.InputJsonValue) : Prisma.JsonNull },
    select: assetSelect,
  })
}

export async function deleteAsset(workspaceId: string, id: string) {
  const existing = await prisma.asset.findFirst({ where: { id, workspaceId }, select: { id: true, storageKey: true } })
  if (!existing) throw new AppError(404, 'Asset not found', 'NOT_FOUND')
  await deleteObject(existing.storageKey).catch(() => undefined)
  await prisma.asset.delete({ where: { id } })
  return { id, deleted: true }
}
