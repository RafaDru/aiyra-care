import type { Pool } from 'pg'

export type AcquireEnqueueSlotResult =
  | { acquired: true }
  | { acquired: false; reason: 'dedupe_window' | 'min_count' }

export class ClientErrorIncidentSignalPgRepository {
  constructor(private readonly pool: Pool) {}

  async tryAcquireEnqueueSlot(
    fingerprint: string,
    deploymentTier: string,
    dedupeMs: number,
    minCount = 1,
  ): Promise<AcquireEnqueueSlotResult> {
    const safeMin = Number.isFinite(minCount) && minCount > 0 ? Math.floor(minCount) : 1

    const bump = await this.pool.query(
      `INSERT INTO client_error_incident_signals (
         fingerprint, deployment_tier, occurrence_count, last_enqueued_at
       ) VALUES ($1, $2, 1, '1970-01-01'::timestamptz)
       ON CONFLICT (fingerprint, deployment_tier) DO UPDATE SET
         occurrence_count = CASE
           WHEN client_error_incident_signals.last_enqueued_at >
             NOW() - ($3::numeric / 1000.0) * INTERVAL '1 second'
           THEN client_error_incident_signals.occurrence_count
           ELSE client_error_incident_signals.occurrence_count + 1
         END,
         updated_at = NOW()
       RETURNING occurrence_count, last_enqueued_at`,
      [fingerprint, deploymentTier, dedupeMs],
    )

    const row = bump.rows[0] as { occurrence_count: number; last_enqueued_at: Date } | undefined
    if (!row) {
      return { acquired: false, reason: 'dedupe_window' }
    }

    const lastEnqueuedMs = new Date(row.last_enqueued_at).getTime()
    const inPostEnqueueDedupe =
      lastEnqueuedMs > 0 &&
      Date.now() - lastEnqueuedMs < dedupeMs

    if (inPostEnqueueDedupe) {
      return { acquired: false, reason: 'dedupe_window' }
    }

    if (Number(row.occurrence_count) < safeMin) {
      return { acquired: false, reason: 'min_count' }
    }

    const res = await this.pool.query(
      `UPDATE client_error_incident_signals SET
         last_enqueued_at = NOW(),
         occurrence_count = 0,
         updated_at = NOW()
       WHERE fingerprint = $1
         AND deployment_tier = $2
         AND last_enqueued_at <= NOW() - ($3::numeric / 1000.0) * INTERVAL '1 second'
       RETURNING fingerprint`,
      [fingerprint, deploymentTier, dedupeMs],
    )
    if (res.rowCount && res.rowCount > 0) {
      return { acquired: true }
    }
    return { acquired: false, reason: 'dedupe_window' }
  }

  async attachQueueId(
    fingerprint: string,
    deploymentTier: string,
    queueId: string,
  ): Promise<void> {
    await this.pool.query(
      `UPDATE client_error_incident_signals SET
        last_incident_queue_id = $3::uuid,
        updated_at = NOW()
       WHERE fingerprint = $1 AND deployment_tier = $2`,
      [fingerprint, deploymentTier, queueId],
    )
  }
}
