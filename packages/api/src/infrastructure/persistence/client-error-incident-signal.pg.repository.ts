import type { Pool } from 'pg'

export type AcquireEnqueueSlotResult =
  | { acquired: true }
  | { acquired: false; reason: 'dedupe_window' }

export class ClientErrorIncidentSignalPgRepository {
  constructor(private readonly pool: Pool) {}

  async tryAcquireEnqueueSlot(
    fingerprint: string,
    deploymentTier: string,
    dedupeMs: number,
  ): Promise<AcquireEnqueueSlotResult> {
    const res = await this.pool.query(
      `INSERT INTO client_error_incident_signals (fingerprint, deployment_tier, last_enqueued_at, updated_at)
       VALUES ($1, $2, NOW(), NOW())
       ON CONFLICT (fingerprint, deployment_tier) DO UPDATE SET
         last_enqueued_at = NOW(),
         updated_at = NOW()
       WHERE client_error_incident_signals.last_enqueued_at <= NOW() - ($3::numeric / 1000.0) * INTERVAL '1 second'
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
