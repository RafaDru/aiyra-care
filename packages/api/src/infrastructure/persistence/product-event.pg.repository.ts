import type { Pool } from 'pg'
import type { ProductEventInput, ProductEventRecord } from '../../domain/telemetry/product-event.js'
import type { ProductEventRepository } from '../../domain/telemetry/product-event.repository.js'

function mapRow(row: Record<string, unknown>): ProductEventRecord {
  return {
    id: row.id as string,
    accountId: row.account_id as string | null,
    sessionId: row.session_id as string | null,
    eventName: row.event_name as ProductEventRecord['eventName'],
    route: row.route as string | null,
    patientId: row.patient_id as string | null,
    properties: (row.properties as Record<string, unknown>) ?? {},
    createdAt: new Date(row.created_at as string),
  }
}

export class ProductEventPgRepository implements ProductEventRepository {
  constructor(private readonly pool: Pool) {}

  async insertMany(
    accountId: string | null,
    events: ProductEventInput[],
  ): Promise<ProductEventRecord[]> {
    const results: ProductEventRecord[] = []
    for (const event of events) {
      const { rows } = await this.pool.query(
        `INSERT INTO product_events (
           account_id, session_id, event_name, route, patient_id, properties
         ) VALUES ($1, $2, $3, $4, $5, $6::jsonb)
         RETURNING *`,
        [
          accountId,
          event.sessionId ?? null,
          event.eventName,
          event.route ?? null,
          event.patientId ?? null,
          JSON.stringify(event.properties ?? {}),
        ],
      )
      results.push(mapRow(rows[0] as Record<string, unknown>))
    }
    return results
  }
}
