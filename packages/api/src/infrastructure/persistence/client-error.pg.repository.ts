import type { Pool } from 'pg'
import type {
  ClientErrorInput,
  ClientErrorRecord,
  ClientErrorAggregateRow,
} from '../../domain/telemetry/client-error.js'

function mapRow(row: Record<string, unknown>): ClientErrorRecord {
  return {
    id: row.id as string,
    accountId: row.account_id as string | null,
    sessionId: row.session_id as string | null,
    fingerprint: row.fingerprint as string,
    feature: row.feature as string,
    errorKind: row.error_kind as ClientErrorRecord['errorKind'],
    errorCode: row.error_code as string,
    route: row.route as string | null,
    patientId: row.patient_id as string | null,
    properties: (row.properties as Record<string, unknown>) ?? {},
    createdAt: new Date(row.created_at as string),
  }
}

export class ClientErrorPgRepository {
  constructor(private readonly pool: Pool) {}

  async insertMany(
    accountId: string | null,
    errors: ClientErrorInput[],
  ): Promise<ClientErrorRecord[]> {
    const results: ClientErrorRecord[] = []
    for (const error of errors) {
      const { rows } = await this.pool.query(
        `INSERT INTO client_errors (
           account_id, session_id, fingerprint, feature, error_kind, error_code,
           route, patient_id, properties
         ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9::jsonb)
         RETURNING *`,
        [
          accountId,
          error.sessionId ?? null,
          error.fingerprint,
          error.feature,
          error.errorKind,
          error.errorCode,
          error.route ?? null,
          error.patientId ?? null,
          JSON.stringify(error.properties ?? {}),
        ],
      )
      results.push(mapRow(rows[0] as Record<string, unknown>))
    }
    return results
  }

  async aggregate24h(limit = 30): Promise<ClientErrorAggregateRow[]> {
    const { rows } = await this.pool.query(
      `SELECT
         fingerprint,
         feature,
         error_kind,
         error_code,
         COUNT(*)::int AS count,
         COUNT(DISTINCT account_id)::int AS account_count,
         MAX(created_at) AS last_seen_at
       FROM client_errors
       WHERE created_at >= NOW() - INTERVAL '24 hours'
       GROUP BY fingerprint, feature, error_kind, error_code
       ORDER BY count DESC
       LIMIT $1`,
      [limit],
    )
    return rows.map((row) => ({
      fingerprint: row.fingerprint as string,
      feature: row.feature as string,
      errorKind: row.error_kind as ClientErrorAggregateRow['errorKind'],
      errorCode: row.error_code as string,
      count: Number(row.count),
      accountCount: Number(row.account_count),
      lastSeenAt: new Date(row.last_seen_at as string).toISOString(),
    }))
  }
}
