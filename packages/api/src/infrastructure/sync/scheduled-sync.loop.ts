import type { FastifyBaseLogger } from 'fastify'
import type { Pool } from 'pg'
import { startConnectWorkerLoop } from './connect-worker.runner.js'

let activeWorker: { stop: () => void } | null = null

export function startScheduledSyncLoop(
  pool: Pool,
  intervalMs: number,
  log?: FastifyBaseLogger,
): void {
  if (activeWorker) return
  activeWorker = startConnectWorkerLoop(pool, intervalMs, log)
}

export function stopScheduledSyncLoop(): void {
  if (activeWorker) activeWorker.stop()
  activeWorker = null
}
