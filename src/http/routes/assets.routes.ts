import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { createAsset, deleteAsset, listAssets, updateAsset } from '../../modules/assets/assets.service.js'
import { AppError } from '../../modules/errors.js'
import { principalOf, requireAuth, requireRole } from '../middleware/requireAuth.js'
import { altBodySchema, assetListQuerySchema } from '../schemas/asset.schemas.js'

const assetParamsSchema = z.object({ id: z.string().min(1).max(50) })

export async function registerAssetRoutes(app: FastifyInstance) {
  app.get('/api/v1/assets', { preHandler: requireAuth }, async (request, reply) => {
    const query = assetListQuerySchema.parse(request.query)
    const { workspaceId } = principalOf(request)
    return reply.send(await listAssets({ workspaceId, ...query }))
  })

  app.post('/api/v1/assets', { preHandler: requireAuth }, async (request, reply) => {
    const principal = principalOf(request)
    let filename: string | undefined
    let mimeType: string | undefined
    let buffer: Buffer | undefined
    const fields: Record<string, string> = {}

    try {
      for await (const part of request.parts()) {
        if (part.type === 'file') {
          if (!buffer) {
            buffer = await part.toBuffer()
            filename = part.filename
            mimeType = part.mimetype
          } else {
            // Drain any additional files without buffering them all in memory.
            await part.toBuffer()
          }
        } else {
          fields[part.fieldname] = String(part.value)
        }
      }
    } catch (error) {
      const code = (error as { code?: string }).code
      if (code === 'FST_REQ_FILE_TOO_LARGE') {
        throw new AppError(413, 'File exceeds the 15 MB limit', 'FILE_TOO_LARGE')
      }
      throw error
    }

    if (!buffer || !filename || !mimeType) {
      throw new AppError(400, 'No file was uploaded', 'NO_FILE')
    }

    const alt = {
      ...(fields.alt ? { en: fields.alt } : {}),
      ...(fields.altAr ? { ar: fields.altAr } : {}),
    }

    const asset = await createAsset({
      workspaceId: principal.workspaceId,
      userId: principal.userId,
      filename,
      mimeType,
      buffer,
      alt: alt.en || alt.ar ? alt : undefined,
    })
    return reply.status(201).send(asset)
  })

  app.patch('/api/v1/assets/:id', { preHandler: requireAuth }, async (request, reply) => {
    const { id } = assetParamsSchema.parse(request.params)
    const { alt } = altBodySchema.parse(request.body)
    const { workspaceId } = principalOf(request)
    return reply.send(await updateAsset(workspaceId, id, alt))
  })

  app.delete('/api/v1/assets/:id', { preHandler: [requireAuth, requireRole('admin')] }, async (request, reply) => {
    const { id } = assetParamsSchema.parse(request.params)
    const { workspaceId } = principalOf(request)
    return reply.send(await deleteAsset(workspaceId, id))
  })
}
