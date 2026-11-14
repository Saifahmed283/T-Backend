import { randomUUID } from 'node:crypto'
import type { Prisma } from '../../generated/prisma/client.js'
import { prisma } from '../../db/prisma.js'
import { AppError } from '../../modules/errors.js'
import { sendEmail } from '../../modules/email/email.service.js'
import { config } from '../../config/config.js'
import type { DataRequestType, DataRequestStatus } from '../../generated/prisma/enums.js'

export interface DataRequestInput {
  type: DataRequestType
  email: string
  name?: string
  details?: string
}

export interface DataRequestListInput {
  workspaceId: string
  page?: number
  pageSize?: number
  status?: string
  search?: string
}

export interface Paginated<T> {
  items: T[]
  pagination: {
    page: number
    pageSize: number
    total: number
    totalPages: number
  }
}

export interface DataRequestWithWorkspace {
  id: string
  type: DataRequestType
  email: string
  name?: string | null
  details?: string | null
  status: DataRequestStatus
  verificationToken: string
  verifiedAt: Date | null
  createdAt: Date
  updatedAt: Date
  workspaceId: string
}

export const DATA_REQUEST_TYPES: { value: DataRequestType; label: string; description: string; requiredFields: string[] }[] = [
  { value: 'ACCESS', label: 'Access my data', description: 'Receive a copy of all personal data we hold about you', requiredFields: ['email'] },
  { value: 'RECTIFICATION', label: 'Correct my data', description: 'Update inaccurate or incomplete personal data', requiredFields: ['email', 'details'] },
  { value: 'ERASURE', label: 'Delete my data', description: 'Request erasure of your personal data (right to be forgotten)', requiredFields: ['email', 'details'] },
  { value: 'RESTRICTION', label: 'Restrict processing', description: 'Limit how we process your data while a dispute is resolved', requiredFields: ['email'] },
  { value: 'PORTABILITY', label: 'Port my data', description: 'Receive your data in a structured, machine-readable format', requiredFields: ['email'] },
  { value: 'OBJECTION', label: 'Object to processing', description: 'Object to processing based on legitimate interests or direct marketing', requiredFields: ['email'] },
  { value: 'WITHDRAW_CONSENT', label: 'Withdraw consent', description: 'Withdraw consent for processing that relies on consent', requiredFields: ['email'] },
]

export function getRequiredFields(type: DataRequestType): string[] {
  const config = DATA_REQUEST_TYPES.find(t => t.value === type)
  return config?.requiredFields ?? ['email']
}

function getRequestTypeLabel(type: DataRequestType): string {
  const labels: Record<DataRequestType, string> = {
    ACCESS: 'Access my data',
    RECTIFICATION: 'Correct my data',
    ERASURE: 'Delete my data',
    RESTRICTION: 'Restrict processing',
    PORTABILITY: 'Port my data',
    OBJECTION: 'Object to processing',
    WITHDRAW_CONSENT: 'Withdraw consent',
  }
  return labels[type] ?? type
}

export async function createDataRequest(input: DataRequestInput): Promise<DataRequestWithWorkspace> {
  const verificationToken = randomUUID()
  const verificationUrl = `${config.CORS_ORIGINS[0] ?? 'http://localhost:8443'}/data-request/verify?token=${verificationToken}`

  const workspace = await prisma.workspace.findFirst({
    where: { slug: 'terramorph' }
  })

  if (!workspace) {
    throw new AppError(500, 'Default workspace not found', 'WORKSPACE_NOT_FOUND')
  }

  const dataRequest = await prisma.dataRequest.create({
    data: {
      id: randomUUID(),
      type: input.type,
      email: input.email.toLowerCase(),
      name: input.name,
      details: input.details,
      status: 'PENDING',
      verificationToken,
      workspaceId: workspace.id,
    },
  })

  await sendEmail({
    to: input.email,
    subject: 'Verify your data subject request',
    text: `
      You have submitted a ${getRequestTypeLabel(input.type)} request.
      Please verify your email address by clicking the link below:
      ${verificationUrl}
      This link will expire in 24 hours.
      If you did not make this request, please ignore this email.
    `,
  })

  return {
    ...dataRequest,
    workspaceId: workspace.id,
  }
}

export async function listDataRequests(input: DataRequestListInput): Promise<Paginated<{ id: string; type: string; email: string; name: string | null; details: string | null; status: string; createdAt: Date; verifiedAt: Date | null }>> {
  const page = input.page ?? 1
  const pageSize = input.pageSize ?? 20

  const where: Prisma.DataRequestWhereInput = {
    workspaceId: input.workspaceId,
    ...(input.status && { status: input.status as DataRequestStatus }),
    ...(input.search && {
      OR: [
        { email: { contains: input.search, mode: 'insensitive' } },
        { name: { contains: input.search, mode: 'insensitive' } },
      ],
    }),
  }

  const [items, total] = await Promise.all([
    prisma.dataRequest.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
      select: {
        id: true,
        type: true,
        email: true,
        name: true,
        details: true,
        status: true,
        createdAt: true,
        verifiedAt: true,
      },
    }),
    prisma.dataRequest.count({ where }),
  ])

  return {
    items,
    pagination: {
      page,
      pageSize,
      total,
      totalPages: Math.max(1, Math.ceil(total / pageSize)),
    },
  }
}

export async function getDataRequest(id: string, workspaceId: string) {
  const request = await prisma.dataRequest.findFirst({
    where: { id, workspaceId },
  })
  return request
}

export async function updateDataRequest(
  id: string,
  workspaceId: string,
  data: Partial<{ type: string; email: string; name: string | null; details: string | null; status: string; response: string | null }>
): Promise<{ id: string; type: string; email: string; name: string | null; details: string | null; status: string; response: string | null; verifiedAt: Date | null; createdAt: Date; updatedAt: Date }> {
  const request = await prisma.dataRequest.findFirst({
    where: { id, workspaceId },
  })

  if (!request) {
    throw new AppError(404, 'Data request not found', 'DATA_REQUEST_NOT_FOUND')
  }

  const updateData: Prisma.DataRequestUpdateInput = {}
  if (data.type) updateData.type = data.type as DataRequestType
  if (data.email) updateData.email = data.email
  if (data.name !== undefined) updateData.name = data.name
  if (data.details !== undefined) updateData.details = data.details
  if (data.status) updateData.status = data.status as DataRequestStatus
  if (data.response !== undefined) updateData.response = data.response
  if (data.status === 'COMPLETED' && !request.verifiedAt) {
    updateData.verifiedAt = new Date()
  }

  const updated = await prisma.dataRequest.update({
    where: { id },
    data: updateData,
  })

  return updated
}

export async function deleteDataRequest(id: string, workspaceId: string): Promise<{ deleted: boolean }> {
  const request = await prisma.dataRequest.findFirst({
    where: { id, workspaceId },
  })

  if (!request) {
    throw new AppError(404, 'Data request not found', 'DATA_REQUEST_NOT_FOUND')
  }

  await prisma.dataRequest.delete({ where: { id } })
  return { deleted: true }
}

export async function verifyDataRequest(token: string): Promise<{ id: string; email: string; type: string }> {
  const request = await prisma.dataRequest.findFirst({
    where: { verificationToken: token },
  })

  if (!request) {
    throw new AppError(404, 'Invalid or expired verification token', 'INVALID_VERIFICATION_TOKEN')
  }

  if (request.verifiedAt) {
    throw new AppError(400, 'This request has already been verified', 'ALREADY_VERIFIED')
  }

  const createdAt = new Date(request.createdAt)
  const now = new Date()
  if (now.getTime() - createdAt.getTime() > 24 * 60 * 60 * 1000) {
    throw new AppError(410, 'Verification link has expired', 'VERIFICATION_EXPIRED')
  }

  await prisma.dataRequest.update({
    where: { id: request.id },
    data: {
      verifiedAt: new Date(),
      status: 'IN_PROGRESS',
    },
  })

  await sendEmail({
    to: request.email,
    subject: 'Your data subject request has been verified',
    text: `
      Your ${getRequestTypeLabel(request.type)} request has been verified.
      Our team will now process your request. You will receive updates via email.
      Reference: ${request.id}
    `,
  })

  return {
    id: request.id,
    email: request.email,
    type: request.type,
  }
}

export async function sendStatusUpdateEmail(
  requestId: string,
  workspaceId: string,
  newStatus: string,
  response?: string | null
) {
  const request = await prisma.dataRequest.findFirst({
    where: { id: requestId, workspaceId },
  })

  if (!request) return

  const statusLabels: Record<string, string> = {
    PENDING: 'Pending',
    IN_PROGRESS: 'In Progress',
    COMPLETED: 'Completed',
    REJECTED: 'Rejected',
  }

  await sendEmail({
    to: request.email,
    subject: `Update on your ${getRequestTypeLabel(request.type)} request`,
    text: `
      Your ${getRequestTypeLabel(request.type)} request status has been updated.
      New status: ${statusLabels[newStatus] ?? newStatus}
      ${response ? `Team response: ${response}` : ''}
      Reference: ${request.id}
    `,
  })
}

export async function sendCompletionEmail(requestId: string, workspaceId: string) {
  const request = await prisma.dataRequest.findFirst({
    where: { id: requestId, workspaceId },
  })

  if (!request) return

  await sendEmail({
    to: request.email,
    subject: `Your ${getRequestTypeLabel(request.type)} request has been completed`,
    text: `
      Your ${getRequestTypeLabel(request.type)} request has been completed.
      You can view the response in your account or reply to this email.
      Reference: ${request.id}
    `,
  })
}

/**
 * Export all personal data associated with a data subject request.
 * Returns the request details plus any related personal data we hold.
 */
export async function exportDataRequest(id: string, workspaceId: string) {
  const request = await prisma.dataRequest.findFirst({
    where: { id, workspaceId },
  })

  if (!request) {
    throw new AppError(404, 'Data request not found', 'DATA_REQUEST_NOT_FOUND')
  }

  // Gather all personal data we hold for this email address
  const submissions = await prisma.submission.findMany({
    where: { email: request.email },
    select: { id: true, kind: true, status: true, email: true, name: true, createdAt: true },
  })

  // createdById on ContentItem stores a user ID, not an email — resolve the
  // user first so we export their content items rather than returning empty.
  const user = await prisma.user.findUnique({
    where: { email: request.email },
    select: { id: true },
  })

  const contentItems = await prisma.contentItem.findMany({
    where: { createdById: user?.id },
    select: { id: true, kind: true, status: true, title: true, createdAt: true },
  })

  const sessions = await prisma.session.findMany({
    where: { user: { email: request.email } },
    select: { id: true, activeWorkspaceId: true, createdAt: true, lastUsedAt: true },
  })

  return {
    request: {
      id: request.id,
      type: request.type,
      email: request.email,
      name: request.name,
      details: request.details,
      status: request.status,
      createdAt: request.createdAt,
      verifiedAt: request.verifiedAt,
    },
    personalData: {
      submissions,
      contentItems,
      sessions,
      exportedAt: new Date(),
    },
  }
}