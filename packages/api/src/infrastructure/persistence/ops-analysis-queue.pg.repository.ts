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
import {
  incidentBoardWhereClause,
  type IncidentBoardFilter,
  normalizeIncidentReferenceCode,
} from '../../domain/ops/incident-list-filter.js'
import {
  extractIncidentFingerprint,
  INCIDENT_RECURRENCE_KIND_REINCIDENCIA,
} from '../../domain/ops/incident-recurrence.js'
import { allocateOpsReferenceCode } from './ops-reference-sequence.pg.js'

function mapRow(row: Record<string, unknown>): OpsAnalysisQueueRecord {
  return {
    id: String(row.id),
    referenceCode: row.reference_code != null ? String(row.reference_code) : null,
    sourceType: row.source_type as AnalysisQueueSourceType,
    sourceId: String(row.source_id),
    lane: row.lane as AnalysisQueueLane,
    status: row.status as AnalysisQueueStatus,
    incidentPipelineStatus: (row.incident_pipeline_status as IncidentPipelineStatus) ?? 'open',
    recurrenceOfIncidentId:
      row.recurrence_of_incident_id != null ? String(row.recurrence_of_incident_id) : null,
    recurrenceOfReferenceCode:
      row.recurrence_of_reference_code != null
        ? String(row.recurrence_of_reference_code)
        : null,
    recurrenceKind:
      row.recurrence_kind === INCIDENT_RECURRENCE_KIND_REINCIDENCIA
        ? INCIDENT_RECURRENCE_KIND_REINCIDENCIA
        : null,
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
    const active = await this.pool.query(
      `SELECT * FROM ops_analysis_queue
       WHERE source_type = $1 AND source_id = $2 AND deployment_tier = $3
         AND incident_pipeline_status NOT IN ('resolved', 'dismissed')
       ORDER BY updated_at DESC
       LIMIT 1`,
      [input.sourceType, input.sourceId, input.deploymentTier],
    )
    if (active.rows[0]) {
      const res = await this.pool.query(
        `UPDATE ops_analysis_queue SET
          lane = $2,
          title = $3,
          error_summary = $4,
          context_snapshot = $5::jsonb,
          operator_notes = COALESCE($6, operator_notes),
          investigation_trigger = $7,
          priority = $8,
          status = 'queued',
          remediation_summary = NULL,
          analysis_artifact_path = NULL,
          pr_url = NULL,
          analysis_last_error = NULL,
          completed_at = NULL,
          updated_at = NOW()
        WHERE id = $1::uuid
        RETURNING *`,
        [
          active.rows[0].id,
          input.lane,
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

    const recurrenceOfIncidentId = await this.findRecurrencePriorIncidentId({
      sourceType: input.sourceType,
      sourceId: input.sourceId,
      deploymentTier: input.deploymentTier,
      contextSnapshot: input.contextSnapshot,
    })

    const referenceCode = await allocateOpsReferenceCode(this.pool, 'incident')
    const res = await this.pool.query(
      `INSERT INTO ops_analysis_queue (
        reference_code, source_type, source_id, lane, deployment_tier, title, error_summary,
        context_snapshot, operator_notes, investigation_trigger, priority, status,
        recurrence_of_incident_id, recurrence_kind
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8::jsonb, $9, $10, $11, 'queued', $12, $13)
      RETURNING *`,
      [
        referenceCode,
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
        recurrenceOfIncidentId,
        recurrenceOfIncidentId ? INCIDENT_RECURRENCE_KIND_REINCIDENCIA : null,
      ],
    )
    return mapRow(res.rows[0] as Record<string, unknown>)
  }

  async findRecurrencePriorIncidentId(input: {
    sourceType: AnalysisQueueSourceType
    sourceId: string
    deploymentTier: string
    contextSnapshot?: Record<string, unknown>
  }): Promise<string | null> {
    const bySource = await this.pool.query<{ id: string }>(
      `SELECT id::text AS id FROM ops_analysis_queue
       WHERE source_type = $1 AND source_id = $2 AND deployment_tier = $3
         AND incident_pipeline_status = 'resolved'
       ORDER BY updated_at DESC
       LIMIT 1`,
      [input.sourceType, input.sourceId, input.deploymentTier],
    )
    if (bySource.rows[0]?.id) return bySource.rows[0].id

    const fingerprint = extractIncidentFingerprint(input.contextSnapshot)
    if (!fingerprint) return null

    const byFingerprint = await this.pool.query<{ id: string }>(
      `SELECT q.id::text AS id
       FROM ops_analysis_queue q
       WHERE q.deployment_tier = $2
         AND q.incident_pipeline_status = 'resolved'
         AND q.context_snapshot->>'fingerprint' = $1
       ORDER BY q.updated_at DESC
       LIMIT 1`,
      [fingerprint, input.deploymentTier],
    )
    if (byFingerprint.rows[0]?.id) return byFingerprint.rows[0].id

    const viaFixedDefect = await this.pool.query<{ id: string }>(
      `SELECT q.id::text AS id
       FROM platform_defects d
       JOIN platform_defect_incidents pdi ON pdi.defect_id = d.id
       JOIN ops_analysis_queue q ON q.id = pdi.incident_id
       WHERE d.fingerprint = $1
         AND d.status = 'fixed'
         AND q.deployment_tier = $2
         AND q.incident_pipeline_status IN ('resolved', 'triaged')
       ORDER BY COALESCE(d.fixed_at, q.updated_at) DESC
       LIMIT 1`,
      [fingerprint, input.deploymentTier],
    )
    return viaFixedDefect.rows[0]?.id ?? null
  }

  async linkRecurrenceFromPriorDefect(incidentId: string, parentDefectId: string): Promise<void> {
    await this.pool.query(
      `UPDATE ops_analysis_queue SET
        recurrence_of_incident_id = sub.prior_id,
        recurrence_kind = $3,
        updated_at = NOW()
      FROM (
        SELECT q.id AS prior_id
        FROM platform_defect_incidents pdi
        JOIN ops_analysis_queue q ON q.id = pdi.incident_id
        WHERE pdi.defect_id = $2::uuid
          AND q.incident_pipeline_status IN ('resolved', 'triaged')
        ORDER BY q.updated_at DESC
        LIMIT 1
      ) sub
      WHERE ops_analysis_queue.id = $1::uuid
        AND ops_analysis_queue.recurrence_of_incident_id IS NULL
        AND sub.prior_id IS NOT NULL
        AND sub.prior_id <> ops_analysis_queue.id`,
      [incidentId, parentDefectId, INCIDENT_RECURRENCE_KIND_REINCIDENCIA],
    )
  }

  async resolveIncidentsLinkedToDefect(defectId: string): Promise<string[]> {
    const res = await this.pool.query<{ id: string }>(
      `UPDATE ops_analysis_queue q SET
        incident_pipeline_status = 'resolved',
        status = 'completed',
        completed_at = COALESCE(q.completed_at, NOW()),
        updated_at = NOW()
      FROM platform_defect_incidents pdi
      WHERE pdi.defect_id = $1::uuid
        AND pdi.incident_id = q.id
        AND q.incident_pipeline_status NOT IN ('resolved', 'dismissed')
      RETURNING q.id`,
      [defectId],
    )
    return res.rows.map((row) => row.id)
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
        investigation_requested_at = COALESCE(investigation_requested_at, NOW()),
        analysis_last_error = NULL,
        updated_at = NOW()
      WHERE id = $1::uuid`,
      [id],
    )
  }

  async markPipelineInTriage(id: string): Promise<void> {
    await this.pool.query(
      `UPDATE ops_analysis_queue SET
        incident_pipeline_status = 'in_triage',
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
    const res = await this.pool.query(
      `SELECT q.*, prior.reference_code AS recurrence_of_reference_code
       FROM ops_analysis_queue q
       LEFT JOIN ops_analysis_queue prior ON prior.id = q.recurrence_of_incident_id
       WHERE q.id = $1::uuid`,
      [id],
    )
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
      `SELECT q.*, prior.reference_code AS recurrence_of_reference_code
       FROM ops_analysis_queue q
       LEFT JOIN ops_analysis_queue prior ON prior.id = q.recurrence_of_incident_id
       WHERE q.source_type = $1 AND q.source_id = $2 AND q.deployment_tier = $3`,
      [sourceType, sourceId, deploymentTier],
    )
    if (!res.rows[0]) return null
    return mapRow(res.rows[0] as Record<string, unknown>)
  }

  async listOpen(limit = 100): Promise<OpsAnalysisQueueRecord[]> {
    return this.listForIncidentBoard('needs_attention', limit)
  }

  async listForIncidentBoard(
    filter: IncidentBoardFilter,
    limit = 100,
  ): Promise<OpsAnalysisQueueRecord[]> {
    const where = incidentBoardWhereClause(filter, 'q')
    const res = await this.pool.query(
      `SELECT q.*, prior.reference_code AS recurrence_of_reference_code
       FROM ops_analysis_queue q
       LEFT JOIN ops_analysis_queue prior ON prior.id = q.recurrence_of_incident_id
       WHERE ${where}
       ORDER BY
         CASE q.priority
           WHEN 'critical' THEN 0 WHEN 'high' THEN 1 WHEN 'normal' THEN 2 ELSE 3
         END,
         q.updated_at DESC
       LIMIT $1`,
      [limit],
    )
    return res.rows.map((row) => mapRow(row as Record<string, unknown>))
  }

  async findByReferenceCode(referenceCode: string): Promise<OpsAnalysisQueueRecord | null> {
    const normalized = normalizeIncidentReferenceCode(referenceCode)
    if (!normalized) return null
    const res = await this.pool.query(
      `SELECT q.*, prior.reference_code AS recurrence_of_reference_code
       FROM ops_analysis_queue q
       LEFT JOIN ops_analysis_queue prior ON prior.id = q.recurrence_of_incident_id
       WHERE q.reference_code = $1 LIMIT 1`,
      [normalized],
    )
    if (!res.rows[0]) return null
    return mapRow(res.rows[0] as Record<string, unknown>)
  }

  async searchForIncidentBoard(
    query: string,
    limit = 50,
  ): Promise<OpsAnalysisQueueRecord[]> {
    const trimmed = query.trim()
    if (!trimmed) return []
    const ref = normalizeIncidentReferenceCode(trimmed)
    if (ref) {
      const one = await this.findByReferenceCode(ref)
      return one ? [one] : []
    }
    const params: unknown[] = []
    let where = ''
    if (/^[0-9a-f-]{8,36}$/i.test(trimmed)) {
      params.push(`${trimmed.toLowerCase()}%`)
      where = `id::text LIKE $1`
    } else {
      params.push(`%${trimmed.slice(0, 200)}%`)
      where = `title ILIKE $1`
    }
    params.push(limit)
    const res = await this.pool.query(
      `SELECT q.*, prior.reference_code AS recurrence_of_reference_code
       FROM ops_analysis_queue q
       LEFT JOIN ops_analysis_queue prior ON prior.id = q.recurrence_of_incident_id
       WHERE ${where.replace(/\bid\b/g, 'q.id').replace(/\btitle\b/g, 'q.title')}
       ORDER BY q.updated_at DESC
       LIMIT $2`,
      params,
    )
    return res.rows.map((row) => mapRow(row as Record<string, unknown>))
  }

  /** Incidentes `open` sem outbox ativo (pending/forwarded/claimed). */
  async listOpenNeedingDispatchOutbox(
    limit: number,
    options?: { staleMs?: number },
  ): Promise<OpsAnalysisQueueRecord[]> {
    const staleMs = options?.staleMs
    const params: unknown[] = [limit]
    let staleSql = ''
    if (staleMs != null && staleMs > 0) {
      params.push(staleMs)
      staleSql = `AND q.created_at < NOW() - ($2::bigint * interval '1 millisecond')`
    }
    const res = await this.pool.query(
      `SELECT q.* FROM ops_analysis_queue q
       WHERE q.incident_pipeline_status = 'open'
         AND q.status NOT IN ('completed', 'dismissed')
         ${staleSql}
         AND NOT EXISTS (
           SELECT 1 FROM incident_dispatch_outbox o
           WHERE o.incident_id = q.id
             AND o.status IN ('pending', 'forwarded', 'claimed')
         )
       ORDER BY q.created_at ASC
       LIMIT $1`,
      params,
    )
    return res.rows.map((row) => mapRow(row as Record<string, unknown>))
  }

  /** Incidentes `open` há mais de `staleMs` sem qualquer linha outbox (D5). */
  async countStaleOpenWithoutOutbox(staleMs: number): Promise<number> {
    const res = await this.pool.query<{ count: string }>(
      `SELECT COUNT(*)::text AS count FROM ops_analysis_queue q
       WHERE q.incident_pipeline_status = 'open'
         AND q.status NOT IN ('completed', 'dismissed')
         AND q.created_at < NOW() - ($1::bigint * interval '1 millisecond')
         AND NOT EXISTS (
           SELECT 1 FROM incident_dispatch_outbox o WHERE o.incident_id = q.id
         )`,
      [staleMs],
    )
    return Number(res.rows[0]?.count ?? 0)
  }

  async attentionCounts(deploymentTier?: string): Promise<OpsAnalysisAttentionCounts> {
    const openIncidentFilter = `status NOT IN ('dismissed')
           AND incident_pipeline_status NOT IN ('triaged', 'resolved', 'dismissed')`
    const res = await this.pool.query<{ status: string; count: string }>(
      deploymentTier
        ? `SELECT status, COUNT(*)::text AS count FROM ops_analysis_queue
           WHERE deployment_tier = $1 AND ${openIncidentFilter}
           GROUP BY status`
        : `SELECT status, COUNT(*)::text AS count FROM ops_analysis_queue
           WHERE ${openIncidentFilter}
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
