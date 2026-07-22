import { Document, type DocumentProps } from '../../domain/document/document.entity.js'
import type { DocumentRepository, DocumentFilter } from '../../domain/document/document.repository.js'
import { NotFoundError } from '../../domain/errors.js'

export class DocumentService {
  constructor(private readonly repo: DocumentRepository) {}

  async create(data: DocumentProps) {
    const document = Document.create(data)
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
