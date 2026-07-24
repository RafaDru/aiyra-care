export interface UploadResult {
  path: string
  sizeBytes: number
}

export interface FileStorage {
  upload(patientId: string, filename: string, buffer: Buffer, mimeType: string): Promise<UploadResult>
  delete(path: string): Promise<void>
}
