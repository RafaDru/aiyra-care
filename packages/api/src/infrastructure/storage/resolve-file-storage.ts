import type { FileStorage } from '../../domain/document/file-storage.js'
import { GcsFileStorage, isGcsStorageConfigured } from './gcs.storage.js'
import { LocalFsFileStorage } from './local-fs.storage.js'

/** GCS quando credencial disponível; disco local no CI/dev sem GCP. */
export function resolveFileStorage(): FileStorage {
  if (isGcsStorageConfigured()) return new GcsFileStorage()
  return new LocalFsFileStorage()
}
