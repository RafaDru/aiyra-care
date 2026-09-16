/**
 * Entrada única para Cloud Run Job (preview/prod).
 * CONNECT_WORKER_JOB_MODE=sync | ops
 */
import { createWorkerPool, loadMonorepoEnv } from './env.js'
import { runConnectWorkerBatch } from '../../api/src/infrastructure/sync/connect-worker.runner.js'
import { runOpsProbeCheck } from './ops-probe.js'
import { runOpsAlertsCheck } from './ops-alerts.js'
import { recordOpsWorkerTick } from './ops-worker-tick.js'

loadMonorepoEnv()

const mode = (process.env.CONNECT_WORKER_JOB_MODE ?? 'ops').trim().toLowerCase()
const pool = createWorkerPool()

try {
  if (mode === 'sync') {
    await recordOpsWorkerTick(pool, 'scheduled_sync')
    const report = await runConnectWorkerBatch(pool)
    console.log(JSON.stringify({ job: 'sync', report }, null, 2))
  } else if (mode === 'ops') {
    await recordOpsWorkerTick(pool, 'ops_alerts')
    const probe = await runOpsProbeCheck(pool)
    console.log('[connect-worker/job] probe', JSON.stringify(probe))
    const alerts = await runOpsAlertsCheck(pool)
    console.log('[connect-worker/job] alerts', JSON.stringify(alerts))
  } else {
    console.error(`CONNECT_WORKER_JOB_MODE inválido: ${mode} (use sync ou ops)`)
    process.exit(1)
  }
} catch (err) {
  console.error('[connect-worker/job] failed', err instanceof Error ? err.message : err)
  process.exit(1)
} finally {
  await pool.end()
}
