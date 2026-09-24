import type { Pool } from 'pg'
import type {
  AnalysisQueueLane,
  AnalysisQueuePriority,
  AnalysisQueueSourceType,
  AnalysisQueueStatus,
  IncidentPipelineStatus,
  OpsAnalysisAttentionCounts,
  OpsAnalysisQueueRecord,
} from '../../domain/ops/ops-analysis-queue.types.js'

function mapRow(row: Record<string, unknown>): OpsAnalysisQueueRecord {
  return {
    id: String(row.id),
    sourceType: row.source_type as AnalysisQueueSourceType,
    sourceId: String(row.source_id),
    lane: row.lane as AnalysisQueueLane,
    status: row.status as AnalysisQueueStatus,
    incidentPipelineStatus: (row.incident_pipeline_status as IncidentPipelineStatus) ?? 'open',
    priority: row.priority as AnalysisQueuePriority,
    deploymentTier: String(row.deployment_tier),
    title: String(row.title),
    errorSummary: row.error_summary != null ? String(row.error_summary) : null,
    contextSnapshot: (row.context_snapshot as Record<string, unknown>) ?? {},
    remediationSummary: row.remediation_summary != null ? String(row.remediation_summary) : null,
    analysisArtifactPath: row.analysis_artifact_path != null ? String(row.analysis_artifact_path) : null,
    prUrl: row.pr_url != null ? String(row.pr_url) : null,
    analysisLastError: row.analysis_last_error != null ? String(row.analysis_last_error) : null,
    operatorNotes: row.operator_notes != null ? String(row.operator_notes) : null,
    investigationTrigger: row.investigation_trigger as 'auto' | 'manual' | null,
    queuedAt: new Date(String(row.queued_at)).toISOString(),
    investigationRequestedAt: row.investigation_requested_at
      ? new Date(String(row.investigation_requested_at)).toISOString()
      : null,
    completedAt: row.completed_at ? new Date(String(row.completed_at)).toISOString() : null,
    createdAt: new Date(String(row.created_at)).toISOString(),
    updatedAt: new Date(String(row.updated_at)).toISOString(),
  }
}

export interface UpsertQueueInput {
  sourceType: AnalysisQueueSourceType
  sourceId: string
  lane: AnalysisQueueLane
  deploymentTier: string
  title: string
  errorSummary?: string | null
  contextSnapshot?: Record<string, unknown>
  operatorNotes?: string | null
  investigationTrigger?: 'auto' | 'manual'
  priority?: AnalysisQueuePriority
}

export class OpsAnalysisQueuePgRepository {
  constructor(private readonly pool: Pool) {}

  async upsertQueued(input: UpsertQueueInput): Promise<OpsAnalysisQueueRecord> {
    const res = await this.pool.query(
      `INSERT INTO ops_analysis_queue (
        source_type, source_id, lane, deployment_tier, title, error_summary,
        context_snapshot, operator_notes, investigation_trigger, priority, status
      ) VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb, $8, $9, $10, 'queued')
      ON CONFLICT (source_type, source_id, deployment_tier) DO UPDATE SET
        lane = EXCLUDED.lane,
        title = EXCLUDED.title,
        error_summary = EXCLUDED.error_summary,
        context_snapshot = EXCLUDED.context_snapshot,
        operator_notes = COALESCE(EXCLUDED.operator_notes, ops_analysis_queue.operator_notes),
        investigation_trigger = EXCLUDED.investigation_trigger,
        priority = EXCLUDED.priority,
        status = 'queued',
        remediation_summary = NULL,
        analysis_artifact_path = NULL,
        pr_url = NULL,
        analysis_last_error = NULL,
        completed_at = NULL,
        updated_at = NOW()
      RETURNING *`,
      [
        input.sourceType,
        input.sourceId,
        input.lane,
        input.deploymentTier,
        input.title.slice(0, 512),
        input.errorSummary?.slice(0, 4000) ?? null,
        JSON.stringify(input.contextSnapshot ?? {}),
        input.operatorNotes?.slice(0, 2000) ?? null,
        input.investigationTrigger ?? null,
        input.priority ?? 'normal',
      ],
    )
    return mapRow(res.rows[0] as Record<string, unknown>)
  }

  async setIncidentPipelineStatus(id: string, status: IncidentPipelineStatus): Promise<void> {
    await this.pool.query(
      `UPDATE ops_analysis_queue SET
        incident_pipeline_status = $2,
        updated_at = NOW()
      WHERE id = $1::uuid`,
      [id, status],
    )
  }

  async markInvestigating(id: string): Promise<void> {
    await this.pool.query(
      `UPDATE ops_analysis_queue SET
        status = 'investigating',
        incident_pipeline_status = 'in_triage',
        investigation_requested_at = COALESCE(investigation_requested_at, NOW()),
        analysis_last_error = NULL,
        updated_at = NOW()
      WHERE id = $1::uuid`,
      [id],
    )
  }

  async markDismissed(id: string, reason: string): Promise<void> {
    await this.pool.query(
      `UPDATE ops_analysis_queue SET
        status = 'dismissed',
        incident_pipeline_status = 'dismissed',
        remediation_summary = $2,
        analysis_last_error = NULL,
        updated_at = NOW()
      WHERE id = $1::uuid`,
      [id, reason.slice(0, 4000)],
    )
  }

  async markDeferred(id: string, reason: string): Promise<void> {
    await this.pool.query(
      `UPDATE ops_analysis_queue SET
        status = 'queued',
        remediation_summary = $2,
        updated_at = NOW()
      WHERE id = $1::uuid`,
      [id, `pre_screen_defer: ${reason}`.slice(0, 4000)],
    )
  }

  async markFailed(id: string, error: string): Promise<void> {
    await this.pool.query(
      `UPDATE ops_analysis_queue SET
        status = 'failed',
        analysis_last_error = $2,
        updated_at = NOW()
      WHERE id = $1::uuid`,
      [id, error.slice(0, 2000)],
    )
  }

  async applyAgentCallback(
    id: string,
    input: {
      remediationSummary: string
      analysisArtifactPath?: string | null
      prUrl?: string | null
      errorSummary?: string | null
    },
  ): Promise<OpsAnalysisQueueRecord | null> {
    const res = await this.pool.query(
      `UPDATE ops_analysis_queue SET
        status = 'fix_proposed',
        remediation_summary = $2,
        analysis_artifact_path = $3,
        pr_url = $4,
        error_summary = COALESCE($5, error_summary),
        analysis_last_error = NULL,
        updated_at = NOW()
      WHERE id = $1::uuid
      RETURNING *`,
      [
        id,
        input.remediationSummary.slice(0, 4000),
        input.analysisArtifactPath?.slice(0, 512) ?? null,
        input.prUrl?.slice(0, 512) ?? null,
        input.errorSummary?.slice(0, 4000) ?? null,
      ],
    )
    if (!res.rows[0]) return null
    return mapRow(res.rows[0] as Record<string, unknown>)
  }

  async markCompleted(id: string): Promise<boolean> {
    const res = await this.pool.query(
      `UPDATE ops_analysis_queue SET
        status = 'completed',
        completed_at = NOW(),
        updated_at = NOW()
      WHERE id = $1::uuid`,
      [id],
    )
    return (res.rowCount ?? 0) > 0
  }

  async findById(id: string): Promise<OpsAnalysisQueueRecord | null> {
    const res = await this.pool.query(`SELECT * FROM ops_analysis_queue WHERE id = $1::uuid`, [id])
    if (!res.rows[0]) return null
    return mapRow(res.rows[0] as Record<string, unknown>)
  }

  async findInvestigationIdsBySourceIds(
    sourceType: AnalysisQueueSourceType,
    sourceIds: string[],
    deploymentTier: string,
  ): Promise<Map<string, string>> {
    if (!sourceIds.length) return new Map()
    const res = await this.pool.query<{ source_id: string; id: string }>(
      `SELECT source_id, id::text AS id FROM ops_analysis_queue
       WHERE source_type = $1 AND deployment_tier = $2 AND source_id = ANY($3::text[])`,
      [sourceType, deploymentTier, sourceIds],
    )
    return new Map(res.rows.map((r) => [r.source_id, r.id]))
  }

  async findBySource(
    sourceType: AnalysisQueueSourceType,
    sourceId: string,
    deploymentTier: string,
  ): Promise<OpsAnalysisQueueRecord | null> {
    const res = await this.pool.query(
      `SELECT * FROM ops_analysis_queue
       WHERE source_type = $1 AND source_id = $2 AND deployment_tier = $3`,
      [sourceType, sourceId, deploymentTier],
    )
    if (!res.rows[0]) return null
    return mapRow(res.rows[0] as Record<string, unknown>)
  }

  async listOpen(limit = 100): Promise<OpsAnalysisQueueRecord[]> {
    const res = await this.pool.query(
      `SELECT * FROM ops_analysis_queue
       WHERE status NOT IN ('completed', 'dismissed')
         AND incident_pipeline_status NOT IN ('triaged', 'dismissed')
       ORDER BY
         CASE priority
           WHEN 'critical' THEN 0 WHEN 'high' THEN 1 WHEN 'normal' THEN 2 ELSE 3
         END,
         updated_at DESC
       LIMIT $1`,
      [limit],
    )
    return res.rows.map((row) => mapRow(row as Record<string, unknown>))
  }

  async attentionCounts(deploymentTier?: string): Promise<OpsAnalysisAttentionCounts> {
    const res = await this.pool.query<{ status: string; count: string }>(
      deploymentTier
        ? `SELECT status, COUNT(*)::text AS count FROM ops_analysis_queue
           WHERE deployment_tier = $1 AND status NOT IN ('completed', 'dismissed')
           GROUP BY status`
        : `SELECT status, COUNT(*)::text AS count FROM ops_analysis_queue
           WHERE status NOT IN ('completed', 'dismissed')
           GROUP BY status`,
      deploymentTier ? [deploymentTier] : [],
    )
    const byStatus = Object.fromEntries(res.rows.map((r) => [r.status, Number(r.count)]))
    const queued = byStatus.queued ?? 0
    const investigating = byStatus.investigating ?? 0
    const fixProposed = byStatus.fix_proposed ?? 0
    const failed = byStatus.failed ?? 0
    return {
      queued,
      investigating,
      fixProposed,
      failed,
      totalAttention: queued + investigating + fixProposed + failed,
    }
  }
}
