import type { Pool } from 'pg'
import type { IncidentDefectCycleMetrics } from '../../domain/ops/incident-defect-cycle-metrics.types.js'

export class IncidentDefectCycleMetricsPgRepository {
  constructor(private readonly pool: Pool) {}

  async getMetrics(windowDays: number): Promise<IncidentDefectCycleMetrics> {
    const days = Math.min(Math.max(Math.floor(windowDays), 1), 90)
    const { rows } = await this.pool.query<{
      inc_open: string
      inc_resolved_window: string
      def_in_fix: string
      def_awaiting_merge: string
      def_fixed_window: string
      avg_days_to_fixed: string | null
    }>(
      `SELECT
         (SELECT COUNT(*)::int FROM ops_analysis_queue
          WHERE incident_pipeline_status NOT IN ('resolved', 'dismissed')) AS inc_open,
         (SELECT COUNT(*)::int FROM ops_analysis_queue
          WHERE incident_pipeline_status = 'resolved'
            AND updated_at >= NOW() - make_interval(days => $1::int)) AS inc_resolved_window,
         (SELECT COUNT(*)::int FROM platform_defects
          WHERE status = 'in_fix') AS def_in_fix,
         (SELECT COUNT(*)::int FROM platform_defects
          WHERE status = 'ready_for_pr') AS def_awaiting_merge,
         (SELECT COUNT(*)::int FROM platform_defects
          WHERE status = 'fixed'
            AND fixed_at >= NOW() - make_interval(days => $1::int)) AS def_fixed_window,
         (SELECT AVG(EXTRACT(EPOCH FROM (fixed_at - first_seen_at)) / 86400.0)
          FROM platform_defects
          WHERE status = 'fixed'
            AND fixed_at IS NOT NULL
            AND fixed_at >= NOW() - make_interval(days => $1::int)) AS avg_days_to_fixed`,
      [days],
    )
    const row = rows[0]
    const avgRaw = row?.avg_days_to_fixed != null ? Number(row.avg_days_to_fixed) : null
    return {
      windowDays: days,
      generatedAt: new Date().toISOString(),
      incidents: {
        open: Number(row?.inc_open ?? 0),
        resolvedInWindow: Number(row?.inc_resolved_window ?? 0),
      },
      defects: {
        inFix: Number(row?.def_in_fix ?? 0),
        awaitingMerge: Number(row?.def_awaiting_merge ?? 0),
        fixedInWindow: Number(row?.def_fixed_window ?? 0),
        avgDaysToFixed: avgRaw != null && Number.isFinite(avgRaw) ? Math.round(avgRaw * 10) / 10 : null,
      },
    }
  }
}
