import { createWorkerPool, loadMonorepoEnv } from './env.js'
import { startConnectWorkerLoop } from '../../api/src/infrastructure/sync/connect-worker.runner.js'

loadMonorepoEnv()

const intervalMs = Number(
  process.env.CONNECT_WORKER_INTERVAL_MS ?? process.env.SYNC_SCHEDULED_INTERVAL_MS ?? '1800000',
)

if (!Number.isFinite(intervalMs) || intervalMs <= 0) {
  console.error('CONNECT_WORKER_INTERVAL_MS (or SYNC_SCHEDULED_INTERVAL_MS) must be > 0')
  process.exit(1)
}

const pool = createWorkerPool()
const worker = startConnectWorkerLoop(pool, intervalMs)

console.log(`[connect-worker] running scheduled sync every ${intervalMs}ms`)

async function shutdown(signal: string) {
  console.log(`[connect-worker] ${signal} — stopping`)
  worker.stop()
  await pool.end()
  process.exit(0)
}

process.on('SIGINT', () => void shutdown('SIGINT'))
process.on('SIGTERM', () => void shutdown('SIGTERM'))
