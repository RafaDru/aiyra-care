import type { FastifyBaseLogger } from 'fastify'
import type { Pool } from 'pg'
import { IntegrationLinkSyncService } from '../../application/integration-link/integration-link-sync.service.js'
import type { ScheduledSyncReport } from '../../application/integration-link/integration-link-sync.service.js'
import { IntegrationLinkPgRepository } from '../persistence/integration-link.pg.repository.js'

export interface ConnectWorkerLogger {
  info: (message: string, meta?: Record<string, unknown>) => void
  warn: (message: string, meta?: Record<string, unknown>) => void
  error: (message: string, meta?: Record<string, unknown>) => void
}

const consoleLogger: ConnectWorkerLogger = {
  info: (message, meta) => (meta ? console.log(message, meta) : console.log(message)),
  warn: (message, meta) => (meta ? console.warn(message, meta) : console.warn(message)),
  error: (message, meta) => (meta ? console.error(message, meta) : console.error(message)),
}

export function createIntegrationLinkSyncService(pool: Pool): IntegrationLinkSyncService {
  const linkRepo = new IntegrationLinkPgRepository(pool)
  return new IntegrationLinkSyncService(pool, linkRepo)
}

function asConnectWorkerLogger(log?: ConnectWorkerLogger | FastifyBaseLogger): ConnectWorkerLogger {
  if (!log) return consoleLogger
  if ('child' in log) {
    const fastify = log as FastifyBaseLogger
    return {
      info: (message, meta) => fastify.info(meta ?? {}, message),
      warn: (message, meta) => fastify.warn(meta ?? {}, message),
      error: (message, meta) => fastify.error(meta ?? {}, message),
    }
  }
  return log as ConnectWorkerLogger
}

function asFastifyLogger(log: ConnectWorkerLogger): FastifyBaseLogger {
  return {
    info: (obj: unknown, msg?: string) => log.info(msg ?? 'info', obj as Record<string, unknown>),
    warn: (obj: unknown, msg?: string) => log.warn(msg ?? 'warn', obj as Record<string, unknown>),
    error: (obj: unknown, msg?: string) => log.error(msg ?? 'error', obj as Record<string, unknown>),
    fatal: (obj: unknown, msg?: string) => log.error(msg ?? 'fatal', obj as Record<string, unknown>),
    debug: (obj: unknown, msg?: string) => log.info(msg ?? 'debug', obj as Record<string, unknown>),
    trace: (obj: unknown, msg?: string) => log.info(msg ?? 'trace', obj as Record<string, unknown>),
    child: () => asFastifyLogger(log),
    level: 'info',
    silent: () => undefined,
  } as FastifyBaseLogger
}

export async function runConnectWorkerBatch(
  pool: Pool,
  log?: ConnectWorkerLogger | FastifyBaseLogger,
): Promise<ScheduledSyncReport> {
  const logger = asConnectWorkerLogger(log)
  const syncService = createIntegrationLinkSyncService(pool)
  logger.info('Connect worker batch starting')
  const report = await syncService.runScheduledBatch(asFastifyLogger(logger))
  logger.info('Connect worker batch finished', {
    candidates: report.candidates,
    started: report.started,
    skipped: report.skipped,
    failed: report.failed,
  })
  return report
}

export function startConnectWorkerLoop(
  pool: Pool,
  intervalMs: number,
  log?: ConnectWorkerLogger | FastifyBaseLogger,
): { stop: () => void } {
  const logger = asConnectWorkerLogger(log)
  let intervalHandle: ReturnType<typeof setInterval> | null = null
  let running = false

  const tick = async () => {
    if (running) {
      logger.warn('Connect worker skipped — previous batch still running')
      return
    }
    running = true
    try {
      await runConnectWorkerBatch(pool, logger)
    } catch (err) {
      logger.error('Connect worker batch failed', {
        error: err instanceof Error ? err.message : String(err),
      })
    } finally {
      running = false
    }
  }

  logger.info('Connect worker loop enabled', { intervalMs })
  intervalHandle = setInterval(() => {
    void tick()
  }, intervalMs)

  return {
    stop: () => {
      if (intervalHandle) clearInterval(intervalHandle)
      intervalHandle = null
    },
  }
}
