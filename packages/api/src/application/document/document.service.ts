import { Document, type DocumentProps } from '../../domain/document/document.entity.js'
import type { DocumentRepository, DocumentFilter } from '../../domain/document/document.repository.js'
import type { FileStorage } from '../../domain/document/file-storage.js'
import type { OcrProvider } from '../../domain/document/ocr-provider.js'
import { NotFoundError } from '../../domain/errors.js'

export class DocumentService {
  constructor(
    private readonly repo: DocumentRepository,
    private readonly storage?: FileStorage,
    private readonly ocr?: OcrProvider,
  ) {}

  async create(data: DocumentProps) {
    const document = Document.create(data)
    return this.repo.save(document)
  }

  async uploadAndCreate(
    patientId: string,
    documentType: DocumentProps['documentType'],
    filename: string,
    buffer: Buffer,
    mimeType: string,
  ) {
    if (!this.storage) throw new Error('FileStorage não configurado')
    if (!this.ocr) throw new Error('OCR não configurado')

    const { path, sizeBytes } = await this.storage.upload(patientId, filename, buffer, mimeType)

    let extractedText: string | undefined
    let ocrProcessed = false
    try {
      const result = await this.ocr.extractText(buffer, mimeType)
      extractedText = result.text
      ocrProcessed = true
    } catch {
      extractedText = undefined
      ocrProcessed = false
    }

    const document = Document.create({
      patientId,
      documentType,
      originalFilename: filename,
      storagePath: path,
      fileSizeBytes: sizeBytes,
      mimeType,
      extractedText,
      ocrProcessed,
    })
    return this.repo.save(document)
  }

  async findById(id: string) {
    const document = await this.repo.findById(id)
    if (!document) throw new NotFoundError('Document', id)
    return document
  }

  async findAll(filter?: DocumentFilter) { return this.repo.findAll(filter) }

  async update(id: string, data: Partial<DocumentProps>) {
    const existing = await this.findById(id)
    const updated = Document.restore({ ...existing.toJSON(), ...data })
    return this.repo.update(updated)
  }

  async delete(id: string) {
    await this.findById(id)
    await this.repo.delete(id)
  }
}
