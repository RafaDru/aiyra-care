import { Storage } from '@google-cloud/storage'
import { randomUUID } from 'crypto'
import { resolve, isAbsolute } from 'path'
import { existsSync } from 'fs'
import type { FileStorage, UploadResult } from '../../domain/document/file-storage.js'

function resolveKeyPath(): string | undefined {
  const env = process.env.GOOGLE_APPLICATION_CREDENTIALS
  if (!env) return undefined
  if (isAbsolute(env) && existsSync(env)) return env
  if (existsSync(env)) return resolve(env)
  const fromRoot = resolve(process.cwd(), '..', '..', env)
  if (existsSync(fromRoot)) return fromRoot
  return undefined
}

const bucketName = process.env.GCS_BUCKET || 'openhealth-documents-503119'
const keyFile = resolveKeyPath()

const storage = new Storage({
  projectId: process.env.GCP_PROJECT_ID,
  ...(keyFile ? { keyFilename: keyFile } : {}),
})

const bucket = storage.bucket(bucketName)

export class GcsFileStorage implements FileStorage {
  async upload(patientId: string, filename: string, buffer: Buffer, mimeType: string): Promise<UploadResult> {
    const ext = filename.includes('.') ? filename.split('.').pop() : ''
    const key = `patients/${patientId}/${randomUUID()}${ext ? `.${ext}` : ''}`
    const file = bucket.file(key)
    await file.save(buffer, { contentType: mimeType, resumable: false })
    return { path: key, sizeBytes: buffer.length }
  }

  async read(path: string): Promise<import('../../domain/document/file-storage.js').StoredFile> {
    const file = bucket.file(path)
    const [buffer] = await file.download()
    let contentType: string | undefined
    try {
      const [meta] = await file.getMetadata()
      contentType = meta.contentType
    } catch {
      contentType = undefined
    }
    return { buffer, contentType }
  }

  async delete(path: string): Promise<void> {
    await bucket.file(path).delete({ ignoreNotFound: true })
  }
}
