import { createWorkerPool, loadMonorepoEnv } from './env.js'
import { startConnectWorkerLoop } from '../../api/src/infrastructure/sync/connect-worker.runner.js'
import { runOpsAlertsCheck } from './ops-alerts.js'
import { runOpsProbeCheck } from './ops-probe.js'
import { recordOpsWorkerTick } from './ops-worker-tick.js'

loadMonorepoEnv()

const intervalMs = Number(
  process.env.CONNECT_WORKER_INTERVAL_MS ?? process.env.SYNC_SCHEDULED_INTERVAL_MS ?? '1800000',
)

if (!Number.isFinite(intervalMs) || intervalMs <= 0) {
  console.error('CONNECT_WORKER_INTERVAL_MS (or SYNC_SCHEDULED_INTERVAL_MS) must be > 0')
  process.exit(1)
}

const pool = createWorkerPool()
const worker = startConnectWorkerLoop(pool, intervalMs, {
  onBatchStart: () => {
    recordOpsWorkerTick(pool, 'scheduled_sync').catch(() => {})
  },
})

console.log(`[connect-worker] running scheduled sync every ${intervalMs}ms`)

const opsAlertsIntervalMs = Number(process.env.OPS_ALERTS_INTERVAL_MS ?? '0')
let opsAlertsTimer: ReturnType<typeof setInterval> | undefined

if (Number.isFinite(opsAlertsIntervalMs) && opsAlertsIntervalMs > 0) {
  const tick = () => {
    recordOpsWorkerTick(pool, 'ops_alerts').catch(() => {})
    runOpsProbeCheck(pool)
      .then((probe) => console.log('[connect-worker] ops-probe', JSON.stringify(probe)))
      .catch((err) => console.error('[connect-worker] ops-probe failed', err instanceof Error ? err.message : err))
    runOpsAlertsCheck(pool)
      .then((result) => console.log('[connect-worker] ops-alerts', JSON.stringify(result)))
      .catch((err) => console.error('[connect-worker] ops-alerts failed', err instanceof Error ? err.message : err))
  }
  opsAlertsTimer = setInterval(tick, opsAlertsIntervalMs)
  setTimeout(tick, 10_000)
  console.log(`[connect-worker] ops alerts every ${opsAlertsIntervalMs}ms (single-instance; prefer over API loop in prod)`)
}

const hygieneScanIntervalMs = Number(process.env.HYGIENE_SCAN_INTERVAL_MS ?? '0')
let hygieneScanTimer: ReturnType<typeof setInterval> | undefined

if (Number.isFinite(hygieneScanIntervalMs) && hygieneScanIntervalMs > 0) {
  void import('./hygiene-scan.js').then(({ runHygieneScanBatch }) => {
    const tickHygiene = () => {
      recordOpsWorkerTick(pool, 'hygiene_scan').catch(() => {})
      runHygieneScanBatch(pool)
        .then((r) => console.log('[connect-worker] hygiene-scan', JSON.stringify(r)))
        .catch((err) => console.error('[connect-worker] hygiene-scan failed', err instanceof Error ? err.message : err))
    }
    hygieneScanTimer = setInterval(tickHygiene, hygieneScanIntervalMs)
    setTimeout(tickHygiene, 60_000)
    console.log(`[connect-worker] hygiene scan every ${hygieneScanIntervalMs}ms`)
  })
}

async function shutdown(signal: string) {
  console.log(`[connect-worker] ${signal} — stopping`)
  if (opsAlertsTimer) clearInterval(opsAlertsTimer)
  if (hygieneScanTimer) clearInterval(hygieneScanTimer)
  worker.stop()
  await pool.end()
  process.exit(0)
}

process.on('SIGINT', () => void shutdown('SIGINT'))
process.on('SIGTERM', () => void shutdown('SIGTERM'))
