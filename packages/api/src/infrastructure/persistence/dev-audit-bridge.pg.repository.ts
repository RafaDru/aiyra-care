import type { Pool } from 'pg'
import { hourBucket } from '../../domain/ops/dev-audit-bridge.js'

export class DevAuditBridgePgRepository {
  constructor(private readonly pool: Pool) {}

  async productEventsByName(hours: number): Promise<Record<string, number>> {
    const { rows } = await this.pool.query(
      `SELECT event_name, COUNT(*)::int AS n
       FROM product_events
       WHERE created_at >= NOW() - ($1::text || ' hours')::interval
       GROUP BY event_name
       ORDER BY n DESC`,
      [String(hours)],
    )
    const out: Record<string, number> = {}
    for (const row of rows) {
      out[String(row.event_name)] = Number(row.n)
    }
    return out
  }

  async productEventsHourly(hours: number): Promise<Array<{ hour: string; count: number }>> {
    const { rows } = await this.pool.query(
      `SELECT date_trunc('hour', created_at) AS hour, COUNT(*)::int AS n
       FROM product_events
       WHERE created_at >= NOW() - ($1::text || ' hours')::interval
       GROUP BY 1
       ORDER BY 1`,
      [String(hours)],
    )
    return rows.map((row) => ({
      hour: hourBucket(new Date(row.hour as string).toISOString()),
      count: Number(row.n),
    }))
  }
}
