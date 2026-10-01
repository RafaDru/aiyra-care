import type { Pool } from 'pg'
import type { DefectPrBatchRecord } from '../../domain/ops/platform-defect.types.js'
import { DefectPrBatchPgRepository } from '../../infrastructure/persistence/defect-pr-batch.pg.repository.js'

export interface DefectPrBatchRunResult {
  batch: DefectPrBatchRecord | null
  defectIds: string[]
  count: number
}

export class DefectPrBatchService {
  constructor(
    private readonly pool: Pool,
    private readonly batchRepo: DefectPrBatchPgRepository,
  ) {}

  config() {
    const intervalMs = Number(process.env.OPS_DEFECT_PR_BATCH_INTERVAL_MS ?? 21_600_000)
    const windowStart = Math.floor(Date.now() / intervalMs) * intervalMs
    return {
      intervalMs,
      nextWindowAt: new Date(windowStart + intervalMs).toISOString(),
    }
  }

  countReady(): Promise<number> {
    return this.batchRepo.countReadyWithoutBatch()
  }

  async runReadyForPrBatch(): Promise<DefectPrBatchRunResult> {
    const intervalMs = Number(process.env.OPS_DEFECT_PR_BATCH_INTERVAL_MS ?? 21_600_000)
    const scheduledWindowStart = new Date(Math.floor(Date.now() / intervalMs) * intervalMs)

    const client = await this.pool.connect()
    try {
      await client.query('BEGIN')
      const selected = await client.query<{ id: string }>(
        `SELECT id::text AS id FROM platform_defects
         WHERE status = 'ready_for_pr' AND pr_batch_id IS NULL
         ORDER BY ready_for_pr_at NULLS LAST, updated_at ASC
         FOR UPDATE SKIP LOCKED`,
      )
      const defectIds = selected.rows.map((r) => r.id)
      if (!defectIds.length) {
        await client.query('ROLLBACK')
        return { batch: null, defectIds: [], count: 0 }
      }

      const batchRes = await client.query(
        `INSERT INTO defect_pr_batches (status, scheduled_window_start, defect_count)
         VALUES ('open', $1, 0)
         RETURNING *`,
        [scheduledWindowStart],
      )
      const batchId = String(batchRes.rows[0].id)

      const assignRes = await client.query(
        `UPDATE platform_defects SET
          pr_batch_id = $1::uuid,
          updated_at = NOW()
         WHERE id = ANY($2::uuid[])
           AND status = 'ready_for_pr'
           AND pr_batch_id IS NULL`,
        [batchId, defectIds],
      )
      const count = assignRes.rowCount ?? 0
      await client.query(`UPDATE defect_pr_batches SET defect_count = $2 WHERE id = $1::uuid`, [
        batchId,
        count,
      ])
      await client.query('COMMIT')

      const row = batchRes.rows[0] as Record<string, unknown>
      return {
        batch: {
          id: batchId,
          status: 'open',
          scheduledWindowStart: scheduledWindowStart.toISOString(),
          mergedPrUrl: null,
          defectCount: count,
          createdAt: new Date(String(row.created_at)).toISOString(),
        },
        defectIds: defectIds.slice(0, count),
        count,
      }
    } catch (err) {
      await client.query('ROLLBACK')
      throw err
    } finally {
      client.release()
    }
  }
}
