import type { Prisma } from '@prisma/client'
import { prisma } from '../../db/prisma.js'
import type { SubmissionKind } from '../../http/schemas/submission.schemas.js'

export type CreateSubmissionInput = {
  kind: SubmissionKind
  email?: string
  name?: string
  message?: string
  source?: string
  payload?: Record<string, unknown>
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
    // Echo only what the caller needs to confirm receipt.
    select: { id: true, kind: true, status: true, createdAt: true },
  })
  return { ...submission, createdAt: submission.createdAt.toISOString() }
}

export type SubmissionListInput = {
  kind?: SubmissionKind
  page: number
  pageSize: number
}

export async function listSubmissions(input: SubmissionListInput) {
  const { kind, page, pageSize } = input
  const where = kind ? { kind } : {}
  const [items, total] = await Promise.all([
    prisma.submission.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
      select: { id: true, kind: true, status: true, email: true, name: true, message: true, source: true, payload: true, createdAt: true },
    }),
    prisma.submission.count({ where }),
  ])
  return {
    items: items.map((item) => ({ ...item, createdAt: item.createdAt.toISOString() })),
    pagination: { page, pageSize, total, totalPages: Math.max(1, Math.ceil(total / pageSize)) },
  }
}
