import type { Pool } from 'pg'
import type {
  ScheduledEventRepository,
  ScheduledEventFilter,
} from '../../domain/scheduled-event/scheduled-event.repository.js'
import { ScheduledEvent } from '../../domain/scheduled-event/scheduled-event.entity.js'
import type { ScheduledEventData } from '../../domain/scheduled-event/scheduled-event.entity.js'

const COLUMNS =
  'id, patient_id, health_thread_id, title, description, scheduled_at, end_at, kind, status, source, external_uid, source_label, created_at, updated_at'

function rowToEntity(row: Record<string, unknown>): ScheduledEvent {
  return ScheduledEvent.restore({
    id: row.id as string,
    patientId: row.patient_id as string,
    healthThreadId: (row.health_thread_id as string | null) ?? null,
    title: row.title as string,
    description: (row.description as string | null) ?? null,
    scheduledAt: row.scheduled_at as Date,
    endAt: (row.end_at as Date | null) ?? null,
    kind: row.kind as ScheduledEventData['kind'],
    status: row.status as ScheduledEventData['status'],
    source: (row.source as ScheduledEventData['source']) ?? 'local',
    externalUid: (row.external_uid as string | null) ?? null,
    sourceLabel: (row.source_label as string | null) ?? null,
    createdAt: row.created_at as Date,
    updatedAt: row.updated_at as Date,
  })
}

export class ScheduledEventPgRepository implements ScheduledEventRepository {
  constructor(private readonly pool: Pool) {}

  async findById(id: string) {
    const { rows } = await this.pool.query(
      `SELECT ${COLUMNS} FROM scheduled_events WHERE id = $1`,
      [id],
    )
    return rows.length ? rowToEntity(rows[0]) : null
  }

  async findByExternalUid(patientId: string, externalUid: string) {
    const { rows } = await this.pool.query(
      `SELECT ${COLUMNS} FROM scheduled_events
       WHERE patient_id = $1 AND external_uid = $2`,
      [patientId, externalUid],
    )
    return rows.length ? rowToEntity(rows[0]) : null
  }

  async findFuzzyDuplicate(patientId: string, title: string, scheduledAt: Date) {
    const { rows } = await this.pool.query(
      `SELECT ${COLUMNS} FROM scheduled_events
       WHERE patient_id = $1
         AND LOWER(title) = LOWER($2)
         AND scheduled_at BETWEEN $3::timestamptz - INTERVAL '2 minutes'
                              AND $3::timestamptz + INTERVAL '2 minutes'
       LIMIT 1`,
      [patientId, title.trim(), scheduledAt],
    )
    return rows.length ? rowToEntity(rows[0]) : null
  }

  async findAll(filter?: ScheduledEventFilter) {
    const conditions: string[] = []
    const params: unknown[] = []
    if (filter?.patientId) {
      conditions.push(`patient_id = $${params.push(filter.patientId)}`)
    }
    if (filter?.healthThreadId) {
      conditions.push(`health_thread_id = $${params.push(filter.healthThreadId)}`)
    }
    if (filter?.status) {
      conditions.push(`status = $${params.push(filter.status)}`)
    }
    if (filter?.from) {
      conditions.push(`scheduled_at >= $${params.push(filter.from)}`)
    }
    if (filter?.to) {
      conditions.push(`scheduled_at <= $${params.push(filter.to)}`)
    }
    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : ''
    const { rows } = await this.pool.query(
      `SELECT ${COLUMNS} FROM scheduled_events ${where} ORDER BY scheduled_at ASC`,
      params,
    )
    return rows.map(rowToEntity)
  }

  async save(event: ScheduledEvent) {
    const { rows } = await this.pool.query(
      `INSERT INTO scheduled_events (
         id, patient_id, health_thread_id, title, description,
         scheduled_at, end_at, kind, status, source, external_uid, source_label
       ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
       RETURNING ${COLUMNS}`,
      [
        event.id,
        event.patientId,
        event.healthThreadId,
        event.title,
        event.description,
        event.scheduledAt,
        event.endAt,
        event.kind,
        event.status,
        event.source,
        event.externalUid,
        event.sourceLabel,
      ],
    )
    return rowToEntity(rows[0])
  }

  async update(event: ScheduledEvent) {
    const { rows } = await this.pool.query(
      `UPDATE scheduled_events SET
         health_thread_id=$1, title=$2, description=$3,
         scheduled_at=$4, end_at=$5, kind=$6, status=$7,
         source=$8, external_uid=$9, source_label=$10, updated_at=NOW()
       WHERE id=$11 RETURNING ${COLUMNS}`,
      [
        event.healthThreadId,
        event.title,
        event.description,
        event.scheduledAt,
        event.endAt,
        event.kind,
        event.status,
        event.source,
        event.externalUid,
        event.sourceLabel,
        event.id,
      ],
    )
    if (!rows.length) throw new Error(`ScheduledEvent ${event.id} not found`)
    return rowToEntity(rows[0])
  }

  async delete(id: string) {
    await this.pool.query('DELETE FROM scheduled_events WHERE id = $1', [id])
  }
}
