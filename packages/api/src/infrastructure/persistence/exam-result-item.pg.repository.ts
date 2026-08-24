import type { Pool } from 'pg'
import type {
  ExamResultItemFilter,
  ExamResultItemRepository,
} from '../../domain/exam-result-item/exam-result-item.repository.js'
import {
  ExamResultItem,
  type ExamMarkerStatus,
} from '../../domain/exam-result-item/exam-result-item.entity.js'

const COLUMNS = `
  id, exam_id, patient_id, marker_name, technical_name,
  numeric_value, display_value, unit, reference_range,
  status, collected_at, source_document_id, created_at
`

function rowToEntity(row: Record<string, unknown>): ExamResultItem {
  return ExamResultItem.restore({
    id: row.id as string,
    examId: row.exam_id as string,
    patientId: row.patient_id as string,
    markerName: row.marker_name as string,
    technicalName: (row.technical_name as string | null) ?? null,
    numericValue: row.numeric_value != null ? Number(row.numeric_value) : null,
    displayValue: row.display_value as string,
    unit: (row.unit as string | null) ?? null,
    referenceRange: (row.reference_range as string | null) ?? null,
    status: (row.status as ExamMarkerStatus) ?? 'normal',
    collectedAt: row.collected_at as Date,
    sourceDocumentId: (row.source_document_id as string | null) ?? null,
    createdAt: row.created_at as Date,
  })
}

export class ExamResultItemPgRepository implements ExamResultItemRepository {
  constructor(private readonly pool: Pool) {}

  async findById(id: string): Promise<ExamResultItem | null> {
    const { rows } = await this.pool.query(
      `SELECT ${COLUMNS} FROM exam_result_items WHERE id = $1`,
      [id],
    )
    return rows.length ? rowToEntity(rows[0]) : null
  }

  async findAll(filter?: ExamResultItemFilter): Promise<ExamResultItem[]> {
    const conditions: string[] = []
    const params: unknown[] = []

    if (filter?.patientId) {
      conditions.push(`patient_id = $${params.push(filter.patientId)}`)
    }
    if (filter?.examId) {
      conditions.push(`exam_id = $${params.push(filter.examId)}`)
    }
    if (filter?.markerName) {
      conditions.push(`marker_name ILIKE $${params.push(`%${filter.markerName}%`)}`)
    }

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : ''
    const { rows } = await this.pool.query(
      `SELECT ${COLUMNS} FROM exam_result_items ${where} ORDER BY collected_at DESC, marker_name ASC`,
      params,
    )
    return rows.map(rowToEntity)
  }

  async save(item: ExamResultItem): Promise<ExamResultItem> {
    const { rows } = await this.pool.query(
      `INSERT INTO exam_result_items (
         id, exam_id, patient_id, marker_name, technical_name,
         numeric_value, display_value, unit, reference_range,
         status, collected_at, source_document_id
       ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
       ON CONFLICT (patient_id, LOWER(marker_name), collected_at, LOWER(display_value))
       DO UPDATE SET
         numeric_value = EXCLUDED.numeric_value,
         unit = EXCLUDED.unit,
         reference_range = EXCLUDED.reference_range,
         status = EXCLUDED.status,
         technical_name = COALESCE(EXCLUDED.technical_name, exam_result_items.technical_name),
         exam_id = EXCLUDED.exam_id,
         source_document_id = COALESCE(EXCLUDED.source_document_id, exam_result_items.source_document_id)
       RETURNING ${COLUMNS}`,
      [
        item.id,
        item.examId,
        item.patientId,
        item.markerName,
        item.technicalName,
        item.numericValue,
        item.displayValue,
        item.unit,
        item.referenceRange,
        item.status,
        item.collectedAt,
        item.sourceDocumentId ?? null,
      ],
    )
    return rowToEntity(rows[0])
  }

  async saveBatch(items: ExamResultItem[]): Promise<ExamResultItem[]> {
    const saved: ExamResultItem[] = []
    for (const item of items) {
      saved.push(await this.save(item))
    }
    return saved
  }

  async delete(id: string): Promise<void> {
    await this.pool.query(`DELETE FROM exam_result_items WHERE id = $1`, [id])
  }

  async deleteByExamId(examId: string): Promise<void> {
    await this.pool.query(`DELETE FROM exam_result_items WHERE exam_id = $1`, [examId])
  }

  /** Remove todos os marcadores derivados de um documento (re-extração). */
  async deleteBySourceDocumentId(documentId: string): Promise<void> {
    await this.pool.query(`DELETE FROM exam_result_items WHERE source_document_id = $1`, [documentId])
  }

  /**
   * Backfill de lastro: vincula marcadores órfãos ao documento do exame de origem
   * (documentId extraído de exams.notes, padrão Hermes Pardini / Mater Dei).
   */
  async backfillSourceDocuments(): Promise<number> {
    const { rowCount } = await this.pool.query(
      `UPDATE exam_result_items eri
       SET source_document_id = sub.doc_id
       FROM (
         SELECT eri2.id AS item_id,
           (regexp_match(e.notes::text, '"documentId":"([0-9a-f-]{36})"'))[1]::uuid AS doc_id
         FROM exam_result_items eri2
         JOIN exams e ON e.id = eri2.exam_id
         WHERE eri2.source_document_id IS NULL
           AND e.notes IS NOT NULL
       ) AS sub
       WHERE eri.id = sub.item_id AND sub.doc_id IS NOT NULL`,
    )
    return rowCount ?? 0
  }
}
