import type { Pool } from 'pg'
import { SyncJob, type SyncJobProps } from '../../domain/sync-job/sync-job.entity.js'
import type { SyncResult } from '../scraper/sync-progress-store.js'
import type { SyncNoveltySummary } from '../../domain/sync-job/sync-job.entity.js'
import { unregisterSyncBrowser } from '../sync/sync-browser-registry.js'

import type { PortalAuthFailureKind } from '../../domain/portal-auth/portal-auth-failure.js'

function rowToProps(row: Record<string, unknown>): SyncJobProps {
  return {
    id: row.id as string,
    integrationLinkId: row.integration_link_id as string,
    portalType: row.portal_type as string,
    trigger: row.trigger as SyncJobProps['trigger'],
    status: row.status as SyncJobProps['status'],
    step: row.step as string | null,
    message: row.message as string | null,
    stepDetails: (row.step_details as SyncJobProps['stepDetails']) ?? {},
    result: row.result as SyncResult | null,
    novelty: row.novelty as SyncNoveltySummary | null,
    error: row.error as string | null,
    failureKind: (row.failure_kind as PortalAuthFailureKind | null) ?? null,
    startedAt: row.started_at as Date,
    finishedAt: row.finished_at as Date | null,
    createdAt: row.created_at as Date,
    updatedAt: row.updated_at as Date,
  }
}

export class SyncJobPgRepository {
  constructor(private readonly pool: Pool) {}

  async save(job: SyncJob): Promise<SyncJob> {
    const d = job.toJSON()
    await this.pool.query(
      `INSERT INTO sync_jobs (
        id, integration_link_id, portal_type, trigger, status, step, message,
        step_details, result, novelty, error, started_at, finished_at, created_at, updated_at
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15)`,
      [
        d.id, d.integrationLinkId, d.portalType, d.trigger, d.status, d.step, d.message,
        JSON.stringify(d.stepDetails), d.result ? JSON.stringify(d.result) : null,
        d.novelty ? JSON.stringify(d.novelty) : null, d.error, d.startedAt, d.finishedAt,
        d.createdAt, d.updatedAt,
      ],
    )
    return job
  }

  async updateProgress(args: {
    id: string
    step: string
    message: string
    status: 'pending' | 'running' | 'success' | 'failed'
    stepDetails: Record<string, { status: string; message: string }>
    result?: SyncResult
    novelty?: SyncNoveltySummary
    error?: string
    failureKind?: PortalAuthFailureKind | null
    finishedAt?: Date
  }): Promise<void> {
    const terminal = args.status === 'success' || args.status === 'failed'
    const errorValue = args.status === 'failed' ? (args.error ?? args.message) : null

    if (terminal) {
      await this.pool.query(
        `UPDATE sync_jobs SET
          step = $2, message = $3, status = $4, step_details = $5,
          result = COALESCE($6, result), novelty = COALESCE($7, novelty),
          error = $8, failure_kind = $9,
          finished_at = COALESCE($10, NOW()),
          updated_at = NOW()
         WHERE id = $1`,
        [
          args.id, args.step, args.message, args.status,
          JSON.stringify(args.stepDetails),
          args.result ? JSON.stringify(args.result) : null,
          args.novelty ? JSON.stringify(args.novelty) : null,
          errorValue,
          args.failureKind ?? null,
          args.finishedAt ?? new Date(),
        ],
      )
      return
    }

    await this.pool.query(
      `UPDATE sync_jobs SET
        step = $2, message = $3, status = $4, step_details = $5,
        result = COALESCE($6, result), novelty = COALESCE($7, novelty),
        updated_at = NOW()
       WHERE id = $1 AND status NOT IN ('success', 'failed')`,
      [
        args.id, args.step, args.message, args.status,
        JSON.stringify(args.stepDetails),
        args.result ? JSON.stringify(args.result) : null,
        args.novelty ? JSON.stringify(args.novelty) : null,
      ],
    )
  }

  async findById(id: string): Promise<SyncJob | null> {
    const { rows } = await this.pool.query('SELECT * FROM sync_jobs WHERE id = $1', [id])
    return rows[0] ? SyncJob.restore(rowToProps(rows[0])) : null
  }

  /** Normaliza jobs órfãos (timeout, running+finished_at, done em step_details). */
  async reconcileEnvironment(): Promise<{
    timedOut: number
    inconsistent: number
    promoted: number
    clearedSuccessErrors: number
  }> {
    const stale = await this.pool.query<{ id: string }>(
      `SELECT id FROM sync_jobs
       WHERE status IN ('pending', 'running')
         AND started_at < NOW() - INTERVAL '30 minutes'`,
    )
    for (const row of stale.rows) {
      await unregisterSyncBrowser(row.id)
    }

    const timedOut = await this.pool.query(
      `UPDATE sync_jobs SET
        status = 'failed', step = 'error',
        message = 'Sincronização expirou (timeout)',
        error = 'Sincronização expirou (timeout)',
        finished_at = COALESCE(finished_at, NOW()), updated_at = NOW()
       WHERE status IN ('pending', 'running')
         AND started_at < NOW() - INTERVAL '30 minutes'`,
    )

    const inconsistent = await this.pool.query(
      `UPDATE sync_jobs SET
        status = 'failed', step = 'error',
        message = 'Sincronização interrompida',
        error = 'Job inconsistente (running com finished_at)',
        finished_at = COALESCE(finished_at, NOW()), updated_at = NOW()
       WHERE status IN ('pending', 'running') AND finished_at IS NOT NULL`,
    )

    const promoted = await this.pool.query(
      `UPDATE sync_jobs SET
        status = 'success',
        step = 'done',
        message = COALESCE(step_details->'done'->>'message', message),
        error = NULL,
        finished_at = COALESCE(finished_at, NOW()),
        updated_at = NOW()
       WHERE status IN ('pending', 'running')
         AND (
           step_details->'done'->>'status' = 'success'
           OR (result IS NOT NULL AND step = 'importing')
         )`,
    )

    const clearedErrors = await this.pool.query(
      `UPDATE sync_jobs SET error = NULL, updated_at = NOW()
       WHERE status = 'success' AND error IS NOT NULL`,
    )

    return {
      timedOut: timedOut.rowCount ?? 0,
      inconsistent: inconsistent.rowCount ?? 0,
      promoted: promoted.rowCount ?? 0,
      clearedSuccessErrors: clearedErrors.rowCount ?? 0,
    }
  }

  async findActiveByLinkId(linkId: string): Promise<SyncJob | null> {
    await this.reconcileEnvironmentForLink(linkId)
    const { rows } = await this.pool.query(
      `SELECT * FROM sync_jobs
       WHERE integration_link_id = $1 AND status IN ('pending', 'running')
       ORDER BY started_at DESC LIMIT 1`,
      [linkId],
    )
    return rows[0] ? SyncJob.restore(rowToProps(rows[0])) : null
  }

  private async reconcileEnvironmentForLink(linkId: string): Promise<void> {
    const stale = await this.pool.query<{ id: string }>(
      `SELECT id FROM sync_jobs
       WHERE integration_link_id = $1 AND status IN ('pending', 'running')
         AND started_at < NOW() - INTERVAL '30 minutes'`,
      [linkId],
    )
    for (const row of stale.rows) {
      await unregisterSyncBrowser(row.id)
    }

    await this.pool.query(
      `UPDATE sync_jobs SET
        status = 'failed', step = 'error',
        message = 'Sincronização expirou (timeout)',
        error = 'Sincronização expirou (timeout)',
        finished_at = COALESCE(finished_at, NOW()), updated_at = NOW()
       WHERE integration_link_id = $1 AND status IN ('pending', 'running')
         AND started_at < NOW() - INTERVAL '30 minutes'`,
      [linkId],
    )
    await this.pool.query(
      `UPDATE sync_jobs SET
        status = 'failed', step = 'error',
        message = 'Sincronização interrompida',
        error = 'Job inconsistente (running com finished_at)',
        finished_at = COALESCE(finished_at, NOW()), updated_at = NOW()
       WHERE integration_link_id = $1 AND status IN ('pending', 'running')
         AND finished_at IS NOT NULL`,
      [linkId],
    )
    await this.pool.query(
      `UPDATE sync_jobs SET
        status = 'success',
        step = 'done',
        message = COALESCE(step_details->'done'->>'message', message),
        error = NULL,
        finished_at = COALESCE(finished_at, NOW()),
        updated_at = NOW()
       WHERE integration_link_id = $1 AND status IN ('pending', 'running')
         AND (
           step_details->'done'->>'status' = 'success'
           OR (result IS NOT NULL AND step = 'importing')
         )`,
      [linkId],
    )
  }

  async findLastCompletedByLinkId(linkId: string): Promise<SyncJob | null> {
    const { rows } = await this.pool.query(
      `SELECT * FROM sync_jobs
       WHERE integration_link_id = $1 AND status IN ('success', 'failed')
       ORDER BY finished_at DESC NULLS LAST, started_at DESC LIMIT 1`,
      [linkId],
    )
    return rows[0] ? SyncJob.restore(rowToProps(rows[0])) : null
  }
}
