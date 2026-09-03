import type pg from 'pg'

/** Heartbeat do connect-worker em product_events (account_id null). */
export async function recordOpsWorkerTick(
  pool: pg.Pool,
  kind: 'ops_alerts' | 'scheduled_sync',
): Promise<void> {
  try {
    await pool.query(
      `INSERT INTO product_events (account_id, event_name, route, properties)
       VALUES (NULL, 'ops_worker_tick', 'connect-worker', $1::jsonb)`,
      [JSON.stringify({ kind })],
    )
  } catch (err) {
    console.warn(
      '[connect-worker] ops_worker_tick failed',
      err instanceof Error ? err.message : err,
    )
  }
}
