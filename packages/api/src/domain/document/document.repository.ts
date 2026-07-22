import type { Document } from './document.entity.js'

export type DocumentFilter = { patientId?: string; documentType?: string }

export interface DocumentRepository {
  findById(id: string): Promise<Document | null>
  findAll(filter?: DocumentFilter): Promise<Document[]>
  save(document: Document): Promise<Document>
  update(document: Document): Promise<Document>
  delete(id: string): Promise<void>
}
