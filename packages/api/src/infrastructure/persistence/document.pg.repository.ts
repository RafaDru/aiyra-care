import type { Pool } from 'pg'
import type { DocumentRepository, DocumentFilter } from '../../domain/document/document.repository.js'
import { Document } from '../../domain/document/document.entity.js'

const COLUMNS = `id, patient_id, document_type, original_filename, storage_path, file_size_bytes, mime_type,
  extracted_text, ocr_processed, ocr_provider, ocr_quality_score, ocr_used_paid, ocr_parse_ok,
  ocr_fields_found, ocr_fields_expected, uploaded_at`

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
    const { rows } = await this.pool.query(
      `INSERT INTO documents (
         id, patient_id, document_type, original_filename, storage_path, file_size_bytes, mime_type,
         extracted_text, ocr_processed, ocr_provider, ocr_quality_score, ocr_used_paid, ocr_parse_ok,
         ocr_fields_found, ocr_fields_expected
       ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15) RETURNING ${COLUMNS}`,
      [
        doc.id, doc.patientId, doc.documentType, doc.originalFilename, doc.storagePath,
        doc.fileSizeBytes, doc.mimeType, doc.extractedText, doc.ocrProcessed,
        doc.ocrProvider, doc.ocrQualityScore, doc.ocrUsedPaid, doc.ocrParseOk,
        doc.ocrFieldsFound, doc.ocrFieldsExpected,
      ],
    )
    return rowToEntity(rows[0])
  }

  async update(doc: Document) {
    const { rows } = await this.pool.query(
      `UPDATE documents SET
         document_type=$1, original_filename=$2, storage_path=$3, file_size_bytes=$4, mime_type=$5,
         extracted_text=$6, ocr_processed=$7, ocr_provider=$8, ocr_quality_score=$9, ocr_used_paid=$10,
         ocr_parse_ok=$11, ocr_fields_found=$12, ocr_fields_expected=$13
       WHERE id=$14 RETURNING ${COLUMNS}`,
      [
        doc.documentType, doc.originalFilename, doc.storagePath, doc.fileSizeBytes, doc.mimeType,
        doc.extractedText, doc.ocrProcessed, doc.ocrProvider, doc.ocrQualityScore, doc.ocrUsedPaid,
        doc.ocrParseOk, doc.ocrFieldsFound, doc.ocrFieldsExpected, doc.id,
      ],
    )
    if (!rows.length) throw new Error('Document ' + doc.id + ' not found')
    return rowToEntity(rows[0])
  }

  async delete(id: string) { await this.pool.query('DELETE FROM documents WHERE id = $1', [id]) }

  /** Aggregate OCR success stats for algorithm tuning. */
  async ocrStats() {
    const { rows } = await this.pool.query(`
      SELECT
        COUNT(*)::int AS total,
        COUNT(*) FILTER (WHERE ocr_processed)::int AS processed,
        COUNT(*) FILTER (WHERE ocr_used_paid)::int AS used_paid,
        COUNT(*) FILTER (WHERE ocr_parse_ok IS TRUE)::int AS parse_ok,
        COUNT(*) FILTER (WHERE ocr_parse_ok IS FALSE)::int AS parse_fail,
        ROUND(AVG(ocr_quality_score)::numeric, 1) AS avg_quality,
        ROUND(AVG(ocr_quality_score) FILTER (WHERE ocr_provider = 'python')::numeric, 1) AS avg_quality_python,
        ROUND(AVG(ocr_quality_score) FILTER (WHERE ocr_provider = 'google_vision')::numeric, 1) AS avg_quality_vision,
        COUNT(*) FILTER (WHERE ocr_provider = 'python')::int AS by_python,
        COUNT(*) FILTER (WHERE ocr_provider = 'google_vision')::int AS by_vision
      FROM documents
      WHERE ocr_processed = TRUE
    `)
    const { rows: byType } = await this.pool.query(`
      SELECT
        document_type,
        COUNT(*)::int AS total,
        COUNT(*) FILTER (WHERE ocr_parse_ok IS TRUE)::int AS parse_ok,
        COUNT(*) FILTER (WHERE ocr_used_paid)::int AS used_paid,
        ROUND(AVG(ocr_quality_score)::numeric, 1) AS avg_quality
      FROM documents
      WHERE ocr_processed = TRUE
      GROUP BY document_type
      ORDER BY total DESC
    `)
    return { summary: rows[0] || {}, byType }
  }
}
