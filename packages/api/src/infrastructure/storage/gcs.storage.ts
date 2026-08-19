import { Storage } from '@google-cloud/storage'
import { randomUUID } from 'crypto'
import { resolve, isAbsolute } from 'path'
import { existsSync } from 'fs'
import type { FileStorage, UploadResult } from '../../domain/document/file-storage.js'

function resolveKeyFromPath(env: string): string | undefined {
  if (isAbsolute(env) && existsSync(env)) return env
  if (existsSync(env)) return resolve(env)
  const fromApiCwd = resolve(process.cwd(), env)
  if (existsSync(fromApiCwd)) return fromApiCwd
  const fromRoot = resolve(process.cwd(), '..', '..', env)
  if (existsSync(fromRoot)) return fromRoot
  return undefined
}

function resolveGcpKeyFile(): string | undefined {
  const candidates = [
    process.env.GOOGLE_APPLICATION_CREDENTIALS,
    process.env.GCP_SERVICE_ACCOUNT_KEY,
  ].filter((v): v is string => Boolean(v?.trim()))
  for (const raw of candidates) {
    const resolved = resolveKeyFromPath(raw.trim())
    if (resolved) return resolved
  }
  return undefined
}

/** GCS upload disponível (service account key no disco). */
export function isGcsStorageConfigured(): boolean {
  return resolveGcpKeyFile() !== undefined
}

const bucketName = process.env.GCS_BUCKET || 'openhealth-documents-503119'
const keyFile = resolveGcpKeyFile()

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
