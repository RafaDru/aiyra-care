import type { Pool } from 'pg'
import type { HealthThreadRepository, HealthThreadFilter } from '../../domain/health-thread/health-thread.repository.js'
import { HealthThread, ACTIVE_HEALTH_THREAD_STATUSES } from '../../domain/health-thread/health-thread.entity.js'
import type { HealthThreadData } from '../../domain/health-thread/health-thread.entity.js'

const COLUMNS =
  'id, patient_id, kind, title, summary, status, priority, confidence, started_at, ended_at, due_date, created_by, metadata, created_at, updated_at'

function rowToEntity(row: Record<string, unknown>): HealthThread {
  return HealthThread.restore({
    id: row.id as string,
    patientId: row.patient_id as string,
    kind: row.kind as HealthThreadData['kind'],
    title: row.title as string,
    summary: row.summary as string | null,
    status: row.status as HealthThreadData['status'],
    priority: row.priority as HealthThreadData['priority'],
    confidence: row.confidence as HealthThreadData['confidence'],
    startedAt: row.started_at as Date | null,
    endedAt: row.ended_at as Date | null,
    dueDate: row.due_date as Date | null,
    createdBy: row.created_by as string | null,
    metadata: (row.metadata as Record<string, unknown>) ?? {},
    createdAt: row.created_at as Date,
    updatedAt: row.updated_at as Date,
  })
}

export class HealthThreadPgRepository implements HealthThreadRepository {
  constructor(private readonly pool: Pool) {}

  async findById(id: string) {
    const { rows } = await this.pool.query(`SELECT ${COLUMNS} FROM health_threads WHERE id = $1`, [id])
    return rows.length ? rowToEntity(rows[0]) : null
  }

  async findAll(filter?: HealthThreadFilter) {
    const conditions: string[] = []
    const params: unknown[] = []
    if (filter?.patientId) conditions.push(`patient_id = $${params.push(filter.patientId)}`)
    if (filter?.status) conditions.push(`status = $${params.push(filter.status)}`)
    if (filter?.activeOnly) {
      const placeholders = ACTIVE_HEALTH_THREAD_STATUSES.map((s) => `$${params.push(s)}`).join(', ')
      conditions.push(`status IN (${placeholders})`)
    }
    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : ''
    const { rows } = await this.pool.query(
      `SELECT ${COLUMNS} FROM health_threads ${where} ORDER BY updated_at DESC`,
      params,
    )
    return rows.map(rowToEntity)
  }

  async save(thread: HealthThread) {
    const { rows } = await this.pool.query(
      `INSERT INTO health_threads (
        id, patient_id, kind, title, summary, status, priority, confidence,
        started_at, ended_at, due_date, created_by, metadata, created_at, updated_at
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15)
      RETURNING ${COLUMNS}`,
      [
        thread.id,
        thread.patientId,
        thread.kind,
        thread.title,
        thread.summary,
        thread.status,
        thread.priority,
        thread.confidence,
        thread.startedAt,
        thread.endedAt,
        thread.dueDate,
        thread.createdBy,
        JSON.stringify(thread.metadata),
        thread.createdAt,
        thread.updatedAt,
      ],
    )
    return rowToEntity(rows[0])
  }

  async update(thread: HealthThread) {
    const { rows } = await this.pool.query(
      `UPDATE health_threads SET
        kind=$1, title=$2, summary=$3, status=$4, priority=$5, confidence=$6,
        started_at=$7, ended_at=$8, due_date=$9, metadata=$10, updated_at=$11
      WHERE id=$12 RETURNING ${COLUMNS}`,
      [
        thread.kind,
        thread.title,
        thread.summary,
        thread.status,
        thread.priority,
        thread.confidence,
        thread.startedAt,
        thread.endedAt,
        thread.dueDate,
        JSON.stringify(thread.metadata),
        thread.updatedAt,
        thread.id,
      ],
    )
    if (!rows.length) throw new Error(`HealthThread ${thread.id} not found`)
    return rowToEntity(rows[0])
  }

  async delete(id: string) {
    await this.pool.query('DELETE FROM health_threads WHERE id = $1', [id])
  }
}
