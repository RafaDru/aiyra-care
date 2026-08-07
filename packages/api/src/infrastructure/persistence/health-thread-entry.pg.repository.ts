import type { Pool } from 'pg'
import type { HealthThreadEntryRepository } from '../../domain/health-thread/health-thread-entry.repository.js'
import { HealthThreadEntry } from '../../domain/health-thread/health-thread-entry.entity.js'
import type { HealthThreadEntryData } from '../../domain/health-thread/health-thread-entry.entity.js'

const COLUMNS = 'id, thread_id, entry_type, body, occurred_at, created_by, created_at'

function rowToEntity(row: Record<string, unknown>): HealthThreadEntry {
  return HealthThreadEntry.restore({
    id: row.id as string,
    threadId: row.thread_id as string,
    entryType: row.entry_type as HealthThreadEntryData['entryType'],
    body: row.body as string,
    occurredAt: row.occurred_at as Date,
    createdBy: row.created_by as string | null,
    createdAt: row.created_at as Date,
  })
}

export class HealthThreadEntryPgRepository implements HealthThreadEntryRepository {
  constructor(private readonly pool: Pool) {}

  async findByThreadId(threadId: string) {
    const { rows } = await this.pool.query(
      `SELECT ${COLUMNS} FROM health_thread_entries WHERE thread_id = $1 ORDER BY occurred_at ASC`,
      [threadId],
    )
    return rows.map(rowToEntity)
  }

  async save(entry: HealthThreadEntry) {
    const { rows } = await this.pool.query(
      `INSERT INTO health_thread_entries (id, thread_id, entry_type, body, occurred_at, created_by, created_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING ${COLUMNS}`,
      [
        entry.id,
        entry.threadId,
        entry.entryType,
        entry.body,
        entry.occurredAt,
        entry.createdBy,
        entry.createdAt,
      ],
    )
    return rowToEntity(rows[0])
  }
}
