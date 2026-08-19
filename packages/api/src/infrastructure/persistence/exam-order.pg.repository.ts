import type { Pool } from 'pg'
import type { ExamOrderRepository, ExamOrderFilter } from '../../domain/exam-order/exam-order.repository.js'
import { ExamOrder } from '../../domain/exam-order/exam-order.entity.js'
import type { ExamOrderData } from '../../domain/exam-order/exam-order.entity.js'

const COLUMNS =
  'id, patient_id, external_key, source, portal_order_id, order_date, laboratory, result_file_url, document_id, notes, created_at'

function rowToEntity(row: Record<string, unknown>): ExamOrder {
  return ExamOrder.restore({
    id: row.id as string,
    patientId: row.patient_id as string,
    externalKey: row.external_key as string,
    source: row.source as string,
    portalOrderId: row.portal_order_id as string | null,
    orderDate: row.order_date as Date | null,
    laboratory: row.laboratory as string | null,
    resultFileUrl: row.result_file_url as string | null,
    documentId: row.document_id as string | null,
    notes: row.notes as string | null,
    createdAt: row.created_at as Date,
  })
}

export class ExamOrderPgRepository implements ExamOrderRepository {
  constructor(private readonly pool: Pool) {}

  async findById(id: string) {
    const { rows } = await this.pool.query(`SELECT ${COLUMNS} FROM exam_orders WHERE id = $1`, [id])
    return rows.length ? rowToEntity(rows[0]) : null
  }

  async findByPatientAndExternalKey(patientId: string, externalKey: string) {
    const { rows } = await this.pool.query(
      `SELECT ${COLUMNS} FROM exam_orders WHERE patient_id = $1 AND external_key = $2`,
      [patientId, externalKey],
    )
    return rows.length ? rowToEntity(rows[0]) : null
  }

  async findAll(filter?: ExamOrderFilter) {
    const params: unknown[] = []
    let where = ''
    if (filter?.patientId) {
      where = 'WHERE patient_id = $1'
      params.push(filter.patientId)
    }
    const { rows } = await this.pool.query(
      `SELECT ${COLUMNS} FROM exam_orders ${where} ORDER BY order_date DESC NULLS LAST, created_at DESC`,
      params,
    )
    return rows.map(rowToEntity)
  }

  async save(order: ExamOrder) {
    const d = order.toJSON()
    const { rows } = await this.pool.query(
      `INSERT INTO exam_orders (
        id, patient_id, external_key, source, portal_order_id, order_date,
        laboratory, result_file_url, document_id, notes
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
      ON CONFLICT (patient_id, external_key) DO UPDATE SET
        portal_order_id = EXCLUDED.portal_order_id,
        order_date = COALESCE(EXCLUDED.order_date, exam_orders.order_date),
        laboratory = COALESCE(EXCLUDED.laboratory, exam_orders.laboratory),
        result_file_url = COALESCE(EXCLUDED.result_file_url, exam_orders.result_file_url),
        document_id = COALESCE(EXCLUDED.document_id, exam_orders.document_id),
        notes = COALESCE(EXCLUDED.notes, exam_orders.notes)
      RETURNING ${COLUMNS}`,
      [
        d.id, d.patientId, d.externalKey, d.source, d.portalOrderId, d.orderDate,
        d.laboratory, d.resultFileUrl, d.documentId, d.notes,
      ],
    )
    return rowToEntity(rows[0])
  }

  async update(order: ExamOrder) {
    const d = order.toJSON()
    const { rows } = await this.pool.query(
      `UPDATE exam_orders SET
        portal_order_id = $1, order_date = $2, laboratory = $3,
        result_file_url = $4, document_id = $5, notes = $6
      WHERE id = $7 RETURNING ${COLUMNS}`,
      [d.portalOrderId, d.orderDate, d.laboratory, d.resultFileUrl, d.documentId, d.notes, d.id],
    )
    if (!rows.length) throw new Error(`ExamOrder ${d.id} not found`)
    return rowToEntity(rows[0])
  }
}
