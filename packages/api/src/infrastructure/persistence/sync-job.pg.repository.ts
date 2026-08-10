import type { Pool } from 'pg'
import { SyncJob, type SyncJobProps } from '../../domain/sync-job/sync-job.entity.js'
import type { SyncResult } from '../scraper/sync-progress-store.js'
import type { SyncNoveltySummary } from '../../domain/sync-job/sync-job.entity.js'

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
    finishedAt?: Date
  }): Promise<void> {
    const terminal = args.status === 'success' || args.status === 'failed'
    await this.pool.query(
      `UPDATE sync_jobs SET
        step = $2, message = $3, status = $4, step_details = $5,
        result = COALESCE($6, result), novelty = COALESCE($7, novelty),
        error = COALESCE($8, error),
        finished_at = CASE WHEN $4 IN ('success', 'failed') THEN COALESCE($9, NOW()) ELSE NULL END,
        updated_at = NOW()
       WHERE id = $1`,
      [
        args.id, args.step, args.message, args.status,
        JSON.stringify(args.stepDetails),
        args.result ? JSON.stringify(args.result) : null,
        args.novelty ? JSON.stringify(args.novelty) : null,
        terminal ? (args.error ?? args.message) : null,
        terminal ? (args.finishedAt ?? new Date()) : null,
      ],
    )
  }

  async findById(id: string): Promise<SyncJob | null> {
    const { rows } = await this.pool.query('SELECT * FROM sync_jobs WHERE id = $1', [id])
    return rows[0] ? SyncJob.restore(rowToProps(rows[0])) : null
  }

  async findActiveByLinkId(linkId: string): Promise<SyncJob | null> {
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
    const { rows } = await this.pool.query(
      `SELECT * FROM sync_jobs
       WHERE integration_link_id = $1 AND status IN ('pending', 'running')
       ORDER BY started_at DESC LIMIT 1`,
      [linkId],
    )
    return rows[0] ? SyncJob.restore(rowToProps(rows[0])) : null
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
