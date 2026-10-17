import { DeleteObjectCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3'
import { config } from '../../config/config.js'
import { AppError } from '../errors.js'

// Thin wrapper over S3-compatible object storage. When credentials are absent
// the whole module stays dormant and callers surface STORAGE_NOT_CONFIGURED
// rather than crashing, so the workspace runs fine without a bucket.
let client: S3Client | undefined

function getClient(): S3Client {
  if (!config.STORAGE_ENABLED) {
    throw new AppError(503, 'Media storage is not configured', 'STORAGE_NOT_CONFIGURED')
  }
  if (!client) {
    client = new S3Client({
      endpoint: config.S3_ENDPOINT,
      region: config.S3_REGION,
      forcePathStyle: config.S3_FORCE_PATH_STYLE ?? false,
      credentials: {
        accessKeyId: config.S3_ACCESS_KEY_ID as string,
        secretAccessKey: config.S3_SECRET_ACCESS_KEY as string,
      },
    })
  }
  return client
}

export function storageEnabled(): boolean {
  return config.STORAGE_ENABLED
}

function publicUrl(key: string): string {
  const base = config.S3_PUBLIC_BASE_URL ?? `${config.S3_ENDPOINT}/${config.S3_BUCKET}`
  return `${base.replace(/\/$/, '')}/${key}`
}

export type PutObjectInput = {
  key: string
  body: Buffer
  contentType: string
}

export async function putObject(input: PutObjectInput): Promise<{ key: string; url: string }> {
  const s3 = getClient()
  await s3.send(
    new PutObjectCommand({
      Bucket: config.S3_BUCKET,
      Key: input.key,
      Body: input.body,
      ContentType: input.contentType,
      CacheControl: 'public, max-age=31536000, immutable',
    }),
  )
  return { key: input.key, url: publicUrl(input.key) }
}

export async function deleteObject(key: string): Promise<void> {
  // Deleting is best-effort: a missing bucket should not fail the API call once
  // the database row is being removed anyway.
  if (!config.STORAGE_ENABLED) return
  const s3 = getClient()
  await s3.send(new DeleteObjectCommand({ Bucket: config.S3_BUCKET, Key: key }))
}
