import type { Prisma } from '../../generated/prisma/client.js'
import { prisma } from '../../db/prisma.js'
import type { SubmissionKind } from '../../http/schemas/submission.schemas.js'

export type CreateSubmissionInput = {
  kind: SubmissionKind
  email?: string
  name?: string
  message?: string
  source?: string
  payload?: Record<string, unknown>
  locale?: 'en' | 'ar'
}

export async function createSubmission(input: CreateSubmissionInput) {
  const submission = await prisma.submission.create({
    data: {
      kind: input.kind,
      email: input.email ?? null,
      name: input.name ?? null,
      message: input.message ?? null,
      source: input.source ?? null,
      payload: input.payload ? (input.payload as Prisma.InputJsonValue) : undefined,
    },
    select: { id: true, kind: true, status: true, createdAt: true },
  })
  return { ...submission, createdAt: submission.createdAt.toISOString() }
}

export type SubmissionListInput = {
  kind?: SubmissionKind
  status?: string
  page: number
  pageSize: number
}

export async function listSubmissions(input: SubmissionListInput) {
  const { kind, status, page, pageSize } = input
  const where: Prisma.SubmissionWhereInput = {}
  if (kind) where.kind = kind
  if (status) where.status = status as never
  const [items, total] = await Promise.all([
    prisma.submission.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
      select: { id: true, kind: true, status: true, email: true, name: true, message: true, source: true, payload: true, createdAt: true, updatedAt: true },
    }),
    prisma.submission.count({ where }),
  ])
  return {
    items: items.map((item) => ({ ...item, createdAt: item.createdAt.toISOString(), updatedAt: item.updatedAt.toISOString() })),
    pagination: { page, pageSize, total, totalPages: Math.max(1, Math.ceil(total / pageSize)) },
  }
}

export async function getSubmission(id: string) {
  const item = await prisma.submission.findUnique({
    where: { id },
    select: { id: true, kind: true, status: true, email: true, name: true, message: true, source: true, payload: true, createdAt: true, updatedAt: true },
  })
  if (!item) return null
  return { ...item, createdAt: item.createdAt.toISOString(), updatedAt: item.updatedAt.toISOString() }
}

export type UpdateSubmissionStatusInput = {
  id: string
  status: string
}

export async function updateSubmissionStatus(input: UpdateSubmissionStatusInput) {
  const item = await prisma.submission.update({
    where: { id: input.id },
    data: { status: input.status as never },
    select: { id: true, kind: true, status: true, email: true, name: true, createdAt: true, updatedAt: true },
  })
  return { ...item, createdAt: item.createdAt.toISOString(), updatedAt: item.updatedAt.toISOString() }
}

export async function deleteSubmission(id: string) {
  await prisma.submission.delete({ where: { id } })
  return { deleted: true }
}

export async function countSubmissionsByStatus() {
  const counts = await prisma.submission.groupBy({
    by: ['status'],
    _count: { id: true },
  })
  return counts.reduce((acc, c) => ({ ...acc, [c.status]: c._count.id }), {} as Record<string, number>)
}