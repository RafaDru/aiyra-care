export type DocumentType = 'prescription' | 'exam' | 'report' | 'vaccine_card' | 'other'

export interface DocumentProps {
  patientId: string
  documentType: DocumentType
  originalFilename: string
  storagePath: string
  fileSizeBytes?: number
  mimeType?: string
  extractedText?: string
  ocrProcessed?: boolean
}

export interface DocumentData {
  id: string
  patientId: string
  documentType: DocumentType
  originalFilename: string
  storagePath: string
  fileSizeBytes: number | null
  mimeType: string | null
  extractedText: string | null
  ocrProcessed: boolean
  uploadedAt: Date
}

export class Document {
  private constructor(private readonly data: DocumentData) {}

  static create(props: DocumentProps, id?: string): Document {
    return new Document({
      id: id ?? crypto.randomUUID(),
      patientId: props.patientId,
      documentType: props.documentType,
      originalFilename: props.originalFilename,
      storagePath: props.storagePath,
      fileSizeBytes: props.fileSizeBytes ?? null,
      mimeType: props.mimeType ?? null,
      extractedText: props.extractedText ?? null,
      ocrProcessed: props.ocrProcessed ?? false,
      uploadedAt: new Date(),
    })
  }

  static restore(data: DocumentData): Document { return new Document(data) }

  get id(): string { return this.data.id }
  get patientId(): string { return this.data.patientId }
  get documentType(): DocumentType { return this.data.documentType }
  get originalFilename(): string { return this.data.originalFilename }
  get storagePath(): string { return this.data.storagePath }
  get fileSizeBytes(): number | null { return this.data.fileSizeBytes }
  get mimeType(): string | null { return this.data.mimeType }
  get extractedText(): string | null { return this.data.extractedText }
  get ocrProcessed(): boolean { return this.data.ocrProcessed }
  get uploadedAt(): Date { return this.data.uploadedAt }

  toJSON(): DocumentData { return { ...this.data } }
}
