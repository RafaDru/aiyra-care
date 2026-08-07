import type { Pool } from 'pg'
import type { DocumentRepository, DocumentFilter } from '../../domain/document/document.repository.js'
import { Document } from '../../domain/document/document.entity.js'
import type { OcrLayout } from '../../domain/document/ocr-provider.js'

const COLUMNS = `id, patient_id, document_type, original_filename, storage_path, file_size_bytes, mime_type,
  extracted_text, ocr_processed, ocr_provider, ocr_quality_score, ocr_used_paid, ocr_parse_ok,
  ocr_fields_found, ocr_fields_expected, ocr_layout, uploaded_at`

function rowToEntity(row: Record<string, unknown>): Document {
  return Document.restore({
    id: row.id as string,
    patientId: row.patient_id as string,
    documentType: row.document_type as Document['documentType'],
    originalFilename: row.original_filename as string,
    storagePath: row.storage_path as string,
    fileSizeBytes: row.file_size_bytes != null ? Number(row.file_size_bytes) : null,
    mimeType: row.mime_type as string | null,
    extractedText: row.extracted_text as string | null,
    ocrProcessed: row.ocr_processed as boolean,
    ocrProvider: (row.ocr_provider as string | null) ?? null,
    ocrQualityScore: row.ocr_quality_score != null ? Number(row.ocr_quality_score) : null,
    ocrUsedPaid: Boolean(row.ocr_used_paid),
    ocrParseOk: row.ocr_parse_ok == null ? null : Boolean(row.ocr_parse_ok),
    ocrFieldsFound: row.ocr_fields_found != null ? Number(row.ocr_fields_found) : null,
    ocrFieldsExpected: row.ocr_fields_expected != null ? Number(row.ocr_fields_expected) : null,
    ocrLayout: (row.ocr_layout as OcrLayout | null) ?? null,
    uploadedAt: row.uploaded_at as Date,
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
    const d = doc.toJSON()
    const { rows } = await this.pool.query(
      `INSERT INTO documents (
         id, patient_id, document_type, original_filename, storage_path, file_size_bytes, mime_type,
         extracted_text, ocr_processed, ocr_provider, ocr_quality_score, ocr_used_paid, ocr_parse_ok,
         ocr_fields_found, ocr_fields_expected, ocr_layout
       ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16) RETURNING ${COLUMNS}`,
      [
        doc.id, doc.patientId, doc.documentType, doc.originalFilename, doc.storagePath,
        doc.fileSizeBytes, doc.mimeType, doc.extractedText, doc.ocrProcessed,
        doc.ocrProvider, doc.ocrQualityScore, doc.ocrUsedPaid, doc.ocrParseOk,
        doc.ocrFieldsFound, doc.ocrFieldsExpected,
        d.ocrLayout ? JSON.stringify(d.ocrLayout) : null,
      ],
    )
    return rowToEntity(rows[0])
  }

  async update(doc: Document) {
    const d = doc.toJSON()
    const { rows } = await this.pool.query(
      `UPDATE documents SET
         document_type=$1, original_filename=$2, storage_path=$3, file_size_bytes=$4, mime_type=$5,
         extracted_text=$6, ocr_processed=$7, ocr_provider=$8, ocr_quality_score=$9, ocr_used_paid=$10,
         ocr_parse_ok=$11, ocr_fields_found=$12, ocr_fields_expected=$13, ocr_layout=$14
       WHERE id=$15 RETURNING ${COLUMNS}`,
      [
        doc.documentType, doc.originalFilename, doc.storagePath, doc.fileSizeBytes, doc.mimeType,
        doc.extractedText, doc.ocrProcessed, doc.ocrProvider, doc.ocrQualityScore, doc.ocrUsedPaid,
        doc.ocrParseOk, doc.ocrFieldsFound, doc.ocrFieldsExpected,
        d.ocrLayout ? JSON.stringify(d.ocrLayout) : null,
        doc.id,
      ],
    )
    if (!rows.length) throw new Error('Document ' + doc.id + ' not found')
    return rowToEntity(rows[0])
  }

  async delete(id: string) {
    await this.pool.query('DELETE FROM documents WHERE id = $1', [id])
  }

  async ocrStats() {
    const { rows } = await this.pool.query(`
      SELECT document_type,
        COUNT(*)::int AS total,
        COUNT(*) FILTER (WHERE ocr_processed)::int AS ocr_ok,
        AVG(ocr_quality_score) FILTER (WHERE ocr_quality_score IS NOT NULL) AS avg_quality
      FROM documents GROUP BY document_type ORDER BY document_type
    `)
    const summary = await this.pool.query(`
      SELECT COUNT(*)::int AS total,
        COUNT(*) FILTER (WHERE ocr_processed)::int AS ocr_ok,
        COUNT(*) FILTER (WHERE ocr_used_paid)::int AS paid_count
      FROM documents
    `)
    return { summary: summary.rows[0] ?? {}, byType: rows }
  }
}
