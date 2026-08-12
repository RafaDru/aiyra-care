import type { FastifyBaseLogger } from 'fastify'
import { IntegrationLinkSyncService } from '../../application/integration-link/integration-link-sync.service.js'
import { IntegrationLinkPgRepository } from '../persistence/integration-link.pg.repository.js'

let intervalHandle: ReturnType<typeof setInterval> | null = null
let running = false

export function startScheduledSyncLoop(
  pool: import('pg').Pool,
  intervalMs: number,
  log?: FastifyBaseLogger,
): void {
  if (intervalHandle) return

  const linkRepo = new IntegrationLinkPgRepository(pool)
  const syncService = new IntegrationLinkSyncService(pool, linkRepo)

  const tick = async () => {
    if (running) {
      log?.warn('Scheduled sync skipped — previous batch still running')
      return
    }
    running = true
    try {
      const report = await syncService.runScheduledBatch(log)
      log?.info({ report }, 'Scheduled sync batch finished')
    } catch (err) {
      log?.error(err, 'Scheduled sync batch failed')
    } finally {
      running = false
    }
  }

  log?.info({ intervalMs }, 'Scheduled sync loop enabled')
  intervalHandle = setInterval(() => {
    void tick()
  }, intervalMs)
}

export function stopScheduledSyncLoop(): void {
  if (intervalHandle) clearInterval(intervalHandle)
  intervalHandle = null
}
