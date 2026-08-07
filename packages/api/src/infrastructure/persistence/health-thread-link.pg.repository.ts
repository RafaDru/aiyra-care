import type { Pool } from 'pg'
import type { HealthThreadLinkRepository } from '../../domain/health-thread/health-thread-link.repository.js'
import { HealthThreadLink } from '../../domain/health-thread/health-thread-link.entity.js'
import type { HealthThreadLinkData } from '../../domain/health-thread/health-thread-link.entity.js'

const COLUMNS = 'id, thread_id, entity_type, entity_id, role, label, created_at'

function rowToEntity(row: Record<string, unknown>): HealthThreadLink {
  return HealthThreadLink.restore({
    id: row.id as string,
    threadId: row.thread_id as string,
    entityType: row.entity_type as HealthThreadLinkData['entityType'],
    entityId: row.entity_id as string,
    role: row.role as HealthThreadLinkData['role'],
    label: row.label as string | null,
    createdAt: row.created_at as Date,
  })
}

export class HealthThreadLinkPgRepository implements HealthThreadLinkRepository {
  constructor(private readonly pool: Pool) {}

  async findByThreadId(threadId: string) {
    const { rows } = await this.pool.query(
      `SELECT ${COLUMNS} FROM health_thread_links WHERE thread_id = $1 ORDER BY created_at ASC`,
      [threadId],
    )
    return rows.map(rowToEntity)
  }

  async findByThreadAndEntity(threadId: string, entityType: string, entityId: string) {
    const { rows } = await this.pool.query(
      `SELECT ${COLUMNS} FROM health_thread_links WHERE thread_id = $1 AND entity_type = $2 AND entity_id = $3`,
      [threadId, entityType, entityId],
    )
    return rows.length ? rowToEntity(rows[0]) : null
  }

  async save(link: HealthThreadLink) {
    const { rows } = await this.pool.query(
      `INSERT INTO health_thread_links (id, thread_id, entity_type, entity_id, role, label, created_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7)
       ON CONFLICT (thread_id, entity_type, entity_id) DO UPDATE SET role = EXCLUDED.role, label = EXCLUDED.label
       RETURNING ${COLUMNS}`,
      [
        link.id,
        link.threadId,
        link.entityType,
        link.entityId,
        link.role,
        link.label,
        link.createdAt,
      ],
    )
    return rowToEntity(rows[0])
  }
}
