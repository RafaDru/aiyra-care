import { mkdir, readFile, unlink, writeFile } from 'fs/promises'
import { dirname, join } from 'path'
import { randomUUID } from 'crypto'
import type { FileStorage, StoredFile, UploadResult } from '../../domain/document/file-storage.js'

const DEFAULT_DIR = join(process.cwd(), '.data', 'file-storage')

function storageRoot(): string {
  return process.env.LOCAL_FILE_STORAGE_DIR?.trim() || DEFAULT_DIR
}

/** Armazenamento em disco — CI e dev sem credencial GCS. */
export class LocalFsFileStorage implements FileStorage {
  async upload(patientId: string, filename: string, buffer: Buffer, mimeType: string): Promise<UploadResult> {
    const ext = filename.includes('.') ? `.${filename.split('.').pop()}` : ''
    const key = `patients/${patientId}/${randomUUID()}${ext}`
    const fullPath = join(storageRoot(), key)
    await mkdir(dirname(fullPath), { recursive: true })
    await writeFile(fullPath, buffer)
    return { path: key, sizeBytes: buffer.length }
  }

  async read(path: string): Promise<StoredFile> {
    const buffer = await readFile(join(storageRoot(), path))
    return { buffer }
  }

  async delete(path: string): Promise<void> {
    await unlink(join(storageRoot(), path)).catch(() => undefined)
  }
}
