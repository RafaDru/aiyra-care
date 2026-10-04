import type { Pool } from 'pg'
import type { DefectPrBatchRecord, DefectPrBatchStatus } from '../../domain/ops/platform-defect.types.js'

function mapRow(row: Record<string, unknown>): DefectPrBatchRecord {
  return {
    id: String(row.id),
    status: row.status as DefectPrBatchStatus,
    scheduledWindowStart: new Date(String(row.scheduled_window_start)).toISOString(),
    mergedPrUrl: row.merged_pr_url != null ? String(row.merged_pr_url) : null,
    defectCount: Number(row.defect_count),
    createdAt: new Date(String(row.created_at)).toISOString(),
  }
}

export class DefectPrBatchPgRepository {
  constructor(private readonly pool: Pool) {}

  async createOpen(scheduledWindowStart: Date): Promise<DefectPrBatchRecord> {
    const res = await this.pool.query(
      `INSERT INTO defect_pr_batches (status, scheduled_window_start)
       VALUES ('open', $1)
       RETURNING *`,
      [scheduledWindowStart],
    )
    return mapRow(res.rows[0] as Record<string, unknown>)
  }

  async assignDefectsToBatch(batchId: string, defectIds: string[]): Promise<number> {
    if (!defectIds.length) return 0
    const res = await this.pool.query(
      `UPDATE platform_defects SET
        pr_batch_id = $1::uuid,
        updated_at = NOW()
      WHERE id = ANY($2::uuid[])
        AND status = 'ready_for_pr'
        AND pr_batch_id IS NULL`,
      [batchId, defectIds],
    )
    const count = res.rowCount ?? 0
    await this.pool.query(
      `UPDATE defect_pr_batches SET defect_count = $2 WHERE id = $1::uuid`,
      [batchId, count],
    )
    return count
  }

  async countReadyWithoutBatch(): Promise<number> {
    const res = await this.pool.query<{ count: string }>(
      `SELECT COUNT(*)::text AS count FROM platform_defects
       WHERE status = 'ready_for_pr' AND pr_batch_id IS NULL`,
    )
    return Number(res.rows[0]?.count ?? 0)
  }
}
