export interface UploadResult {
  path: string
  sizeBytes: number
}

export interface StoredFile {
  buffer: Buffer
  contentType?: string
}

export interface FileStorage {
  upload(patientId: string, filename: string, buffer: Buffer, mimeType: string): Promise<UploadResult>
  read(path: string): Promise<StoredFile>
  delete(path: string): Promise<void>
}
