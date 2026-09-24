import type { Pool } from 'pg'
import type {
  IncidentDispatchOutboxRecord,
  IncidentDispatchOutboxStatus,
  InsertIncidentDispatchOutboxInput,
} from '../../domain/ops/incident-dispatch-outbox.types.js'

function mapRow(row: Record<string, unknown>): IncidentDispatchOutboxRecord {
  return {
    id: String(row.id),
    incidentId: String(row.incident_id),
    idempotencyKey: String(row.idempotency_key),
    payload: (row.payload as Record<string, unknown>) ?? {},
    status: row.status as IncidentDispatchOutboxStatus,
    attemptCount: Number(row.attempt_count),
    lastError: row.last_error != null ? String(row.last_error) : null,
    forwardedAt: row.forwarded_at ? new Date(String(row.forwarded_at)).toISOString() : null,
    claimedAt: row.claimed_at ? new Date(String(row.claimed_at)).toISOString() : null,
    createdAt: new Date(String(row.created_at)).toISOString(),
    updatedAt: new Date(String(row.updated_at)).toISOString(),
  }
}

export class IncidentDispatchOutboxPgRepository {
  constructor(private readonly pool: Pool) {}

  async insertIfAbsent(input: InsertIncidentDispatchOutboxInput): Promise<IncidentDispatchOutboxRecord | null> {
    const res = await this.pool.query(
      `INSERT INTO incident_dispatch_outbox (incident_id, idempotency_key, payload)
       VALUES ($1::uuid, $2, $3::jsonb)
       ON CONFLICT (idempotency_key) DO NOTHING
       RETURNING *`,
      [input.incidentId, input.idempotencyKey.slice(0, 128), JSON.stringify(input.payload)],
    )
    if (!res.rows[0]) return null
    return mapRow(res.rows[0] as Record<string, unknown>)
  }

  async findByIdempotencyKey(key: string): Promise<IncidentDispatchOutboxRecord | null> {
    const res = await this.pool.query(
      `SELECT * FROM incident_dispatch_outbox WHERE idempotency_key = $1`,
      [key.slice(0, 128)],
    )
    if (!res.rows[0]) return null
    return mapRow(res.rows[0] as Record<string, unknown>)
  }

  async listPending(limit = 20): Promise<IncidentDispatchOutboxRecord[]> {
    const res = await this.pool.query(
      `SELECT * FROM incident_dispatch_outbox
       WHERE status IN ('pending', 'forwarded')
       ORDER BY created_at ASC
       LIMIT $1`,
      [limit],
    )
    return res.rows.map((row) => mapRow(row as Record<string, unknown>))
  }

  async markForwarded(id: string): Promise<void> {
    await this.pool.query(
      `UPDATE incident_dispatch_outbox SET
        status = 'forwarded',
        forwarded_at = NOW(),
        updated_at = NOW()
      WHERE id = $1::uuid`,
      [id],
    )
  }

  async claim(id: string): Promise<boolean> {
    const res = await this.pool.query(
      `UPDATE incident_dispatch_outbox SET
        status = 'claimed',
        claimed_at = NOW(),
        updated_at = NOW()
      WHERE id = $1::uuid AND status IN ('pending', 'forwarded')
      RETURNING id`,
      [id],
    )
    return (res.rowCount ?? 0) > 0
  }

  async recordAttemptFailure(id: string, error: string): Promise<void> {
    await this.pool.query(
      `UPDATE incident_dispatch_outbox SET
        status = 'failed',
        attempt_count = attempt_count + 1,
        last_error = $2,
        updated_at = NOW()
      WHERE id = $1::uuid`,
      [id, error.slice(0, 2000)],
    )
  }
}
