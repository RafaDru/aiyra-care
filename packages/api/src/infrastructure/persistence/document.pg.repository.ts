import type { Pool } from 'pg'
import type { DocumentRepository, DocumentFilter } from '../../domain/document/document.repository.js'
import { Document } from '../../domain/document/document.entity.js'
import type { DocumentData } from '../../domain/document/document.entity.js'

const COLUMNS = 'id, patient_id, document_type, original_filename, storage_path, file_size_bytes, mime_type, extracted_text, ocr_processed, uploaded_at'

function rowToEntity(row: Record<string, unknown>): Document {
  return Document.restore({
    id: row.id as string, patientId: row.patient_id as string,
    documentType: row.document_type as Document['documentType'],
    originalFilename: row.original_filename as string, storagePath: row.storage_path as string,
    fileSizeBytes: row.file_size_bytes != null ? Number(row.file_size_bytes) : null,
    mimeType: row.mime_type as string | null, extractedText: row.extracted_text as string | null,
    ocrProcessed: row.ocr_processed as boolean, uploadedAt: row.uploaded_at as Date,
  })
}

export class DocumentPgRepository implements DocumentRepository {
  constructor(private readonly pool: Pool) {}

  async findById(id: string) {
    const { rows } = await this.pool.query(`SELECT ${COLUMNS} FROM documents WHERE id = $1`, [id])
    return rows.length ? rowToEntity(rows[0]) : null
  }

  async findAll(filter?: DocumentFilter) {
    const conditions: string[] = []; const params: unknown[] = []
    if (filter?.patientId) conditions.push('patient_id = $' + (params.push(filter.patientId)))
    if (filter?.documentType) conditions.push('document_type = $' + (params.push(filter.documentType)))
    const where = conditions.length ? 'WHERE ' + conditions.join(' AND ') : ''
    const { rows } = await this.pool.query(`SELECT ${COLUMNS} FROM documents ${where} ORDER BY uploaded_at DESC`, params)
    return rows.map(rowToEntity)
  }

  async save(doc: Document) {
    const { rows } = await this.pool.query(
      `INSERT INTO documents (id, patient_id, document_type, original_filename, storage_path, file_size_bytes, mime_type, extracted_text, ocr_processed)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING ${COLUMNS}`,
      [doc.id, doc.patientId, doc.documentType, doc.originalFilename, doc.storagePath, doc.fileSizeBytes, doc.mimeType, doc.extractedText, doc.ocrProcessed]
    )
    return rowToEntity(rows[0])
  }

  async update(doc: Document) {
    const { rows } = await this.pool.query(
      `UPDATE documents SET document_type=$1, original_filename=$2, storage_path=$3, file_size_bytes=$4, mime_type=$5, extracted_text=$6, ocr_processed=$7 WHERE id=$8 RETURNING ${COLUMNS}`,
      [doc.documentType, doc.originalFilename, doc.storagePath, doc.fileSizeBytes, doc.mimeType, doc.extractedText, doc.ocrProcessed, doc.id]
    )
    if (!rows.length) throw new Error('Document ' + doc.id + ' not found')
    return rowToEntity(rows[0])
  }

  async delete(id: string) { await this.pool.query('DELETE FROM documents WHERE id = $1', [id]) }
}
