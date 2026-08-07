import type { OcrLayout } from './ocr-provider.js'

export type DocumentType =
  | 'prescription'
  | 'exam'
  | 'report'
  | 'vaccine_card'
  | 'other'
  | 'certidao_nascimento'
  | 'rg'
  | 'cpf_card'
  | 'cnh'

export interface DocumentProps {
  patientId: string
  documentType: DocumentType
  originalFilename: string
  storagePath: string
  fileSizeBytes?: number
  mimeType?: string
  extractedText?: string
  ocrProcessed?: boolean
  ocrProvider?: string | null
  ocrQualityScore?: number | null
  ocrUsedPaid?: boolean
  ocrParseOk?: boolean | null
  ocrFieldsFound?: number | null
  ocrFieldsExpected?: number | null
  ocrLayout?: OcrLayout | null
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
  ocrProvider: string | null
  ocrQualityScore: number | null
  ocrUsedPaid: boolean
  ocrParseOk: boolean | null
  ocrFieldsFound: number | null
  ocrFieldsExpected: number | null
  ocrLayout: OcrLayout | null
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
      ocrProvider: props.ocrProvider ?? null,
      ocrQualityScore: props.ocrQualityScore ?? null,
      ocrUsedPaid: props.ocrUsedPaid ?? false,
      ocrParseOk: props.ocrParseOk ?? null,
      ocrFieldsFound: props.ocrFieldsFound ?? null,
      ocrFieldsExpected: props.ocrFieldsExpected ?? null,
      ocrLayout: props.ocrLayout ?? null,
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
  get ocrProvider(): string | null { return this.data.ocrProvider }
  get ocrQualityScore(): number | null { return this.data.ocrQualityScore }
  get ocrUsedPaid(): boolean { return this.data.ocrUsedPaid }
  get ocrParseOk(): boolean | null { return this.data.ocrParseOk }
  get ocrFieldsFound(): number | null { return this.data.ocrFieldsFound }
  get ocrFieldsExpected(): number | null { return this.data.ocrFieldsExpected }
  get ocrLayout(): OcrLayout | null { return this.data.ocrLayout }
  get uploadedAt(): Date { return this.data.uploadedAt }

  toJSON(): DocumentData { return { ...this.data } }
}
