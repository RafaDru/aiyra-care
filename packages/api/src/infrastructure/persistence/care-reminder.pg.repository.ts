import type { Pool } from 'pg'
import type { CareReminderRepository, CareReminderFilter } from '../../domain/care-reminder/care-reminder.repository.js'
import { CareReminder } from '../../domain/care-reminder/care-reminder.entity.js'
import type { CareReminderData, CareReminderKind } from '../../domain/care-reminder/care-reminder.entity.js'

const COLS = 'id, patient_id, health_thread_id, reminder_kind, target_code, medication_name, title, interval_minutes, next_fire_at, last_completed_at, active, dose_hint, created_at, updated_at'

function rowToEntity(row: Record<string, unknown>): CareReminder {
  return CareReminder.restore({
    id: row.id as string,
    patientId: row.patient_id as string,
    healthThreadId: row.health_thread_id as string | null,
    reminderKind: row.reminder_kind as CareReminderKind,
    targetCode: row.target_code as string | null,
    medicationName: row.medication_name as string | null,
    title: row.title as string,
    intervalMinutes: Number(row.interval_minutes),
    nextFireAt: row.next_fire_at as Date,
    lastCompletedAt: row.last_completed_at as Date | null,
    active: Boolean(row.active),
    doseHint: row.dose_hint as string | null,
    createdAt: row.created_at as Date,
    updatedAt: row.updated_at as Date,
  })
}

export class CareReminderPgRepository implements CareReminderRepository {
  constructor(private readonly pool: Pool) {}

  async findById(id: string) {
    const { rows } = await this.pool.query(`SELECT ${COLS} FROM care_reminders WHERE id = $1`, [id])
    return rows.length ? rowToEntity(rows[0]) : null
  }

  async findAll(filter?: CareReminderFilter) {
    const conditions: string[] = []
    const params: unknown[] = []
    if (filter?.patientId) conditions.push(`patient_id = $${params.push(filter.patientId)}`)
    if (filter?.healthThreadId) conditions.push(`health_thread_id = $${params.push(filter.healthThreadId)}`)
    if (filter?.activeOnly) conditions.push('active = true')
    if (filter?.pendingOnly) conditions.push(`next_fire_at <= NOW()`)
    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : ''
    const { rows } = await this.pool.query(
      `SELECT ${COLS} FROM care_reminders ${where} ORDER BY next_fire_at ASC`,
      params,
    )
    return rows.map(rowToEntity)
  }

  async save(reminder: CareReminder) {
    const d = reminder.toJSON()
    const { rows } = await this.pool.query(
      `INSERT INTO care_reminders
       (id, patient_id, health_thread_id, reminder_kind, target_code, medication_name, title, interval_minutes, next_fire_at, last_completed_at, active, dose_hint)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12) RETURNING ${COLS}`,
      [
        d.id, d.patientId, d.healthThreadId, d.reminderKind, d.targetCode, d.medicationName,
        d.title, d.intervalMinutes, d.nextFireAt, d.lastCompletedAt, d.active, d.doseHint,
      ],
    )
    return rowToEntity(rows[0])
  }

  async update(reminder: CareReminder) {
    const d = reminder.toJSON()
    const { rows } = await this.pool.query(
      `UPDATE care_reminders SET
         health_thread_id=$1, reminder_kind=$2, target_code=$3, medication_name=$4, title=$5,
         interval_minutes=$6, next_fire_at=$7, last_completed_at=$8, active=$9, dose_hint=$10, updated_at=NOW()
       WHERE id=$11 RETURNING ${COLS}`,
      [
        d.healthThreadId, d.reminderKind, d.targetCode, d.medicationName, d.title,
        d.intervalMinutes, d.nextFireAt, d.lastCompletedAt, d.active, d.doseHint, d.id,
      ],
    )
    if (!rows.length) throw new Error('CareReminder ' + d.id + ' not found')
    return rowToEntity(rows[0])
  }

  async delete(id: string) {
    await this.pool.query('DELETE FROM care_reminders WHERE id = $1', [id])
  }
}
