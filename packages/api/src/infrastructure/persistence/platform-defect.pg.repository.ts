import type { Pool } from 'pg'
import type {
  CreatePlatformDefectInput,
  PlatformDefectIncidentLinkedBy,
  PlatformDefectRecord,
  PlatformDefectStatus,
} from '../../domain/ops/platform-defect.types.js'
import { normalizeDefectReferenceCode } from '../../domain/ops/incident-list-filter.js'
import { normalizeGithubPrUrlForMatch } from '../../domain/ops/platform-defect-pr-url.js'
import type { PlatformDefectFixedVia } from '../../domain/ops/platform-defect.types.js'
import type { CorrectionFailureDetails } from '../../domain/ops/platform-defect-correction-failure.js'
import type { PlatformDefectFailureKind } from '../../domain/ops/platform-defect-correction-failure.js'
import type {
  DefectPipelineFailureDetails,
  DefectPipelineStatus,
} from '../../domain/ops/platform-defect-pipeline.types.js'
import { allocateOpsReferenceCode } from './ops-reference-sequence.pg.js'

function mapJsonObject(value: unknown): DefectPipelineFailureDetails | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null
  return value as DefectPipelineFailureDetails
}

function mapCorrectionFailureDetails(value: unknown): CorrectionFailureDetails | null {
  if (!value || typeof value !== 'object') return null
  const raw = value as Record<string, unknown>
  if (typeof raw.message !== 'string') return null
  return {
    message: String(raw.message),
    ...(typeof raw.code === 'string' ? { code: raw.code } : {}),
    ...(typeof raw.logUrl === 'string' ? { logUrl: raw.logUrl } : {}),
    ...(typeof raw.runUrl === 'string' ? { runUrl: raw.runUrl } : {}),
    ...(typeof raw.artifactPath === 'string' ? { artifactPath: raw.artifactPath } : {}),
    ...(typeof raw.blockedReason === 'string' ? { blockedReason: raw.blockedReason } : {}),
  }
}

function mapRow(row: Record<string, unknown>): PlatformDefectRecord {
  const apps = row.applications
  return {
    id: String(row.id),
    referenceCode: row.reference_code != null ? String(row.reference_code) : null,
    title: String(row.title),
    status: row.status as PlatformDefectStatus,
    fingerprint: row.fingerprint != null ? String(row.fingerprint) : null,
    impact: row.impact != null ? Number(row.impact) : null,
    applications: Array.isArray(apps) ? apps.map(String) : [],
    ownerSubject: row.owner_subject != null ? String(row.owner_subject) : null,
    triageSummary: row.triage_summary != null ? String(row.triage_summary) : null,
    triageArtifactPath: row.triage_artifact_path != null ? String(row.triage_artifact_path) : null,
    branchName: row.branch_name != null ? String(row.branch_name) : null,
    prUrl: row.pr_url != null ? String(row.pr_url) : null,
    mergedPrUrl: row.merged_pr_url != null ? String(row.merged_pr_url) : null,
    mergedAt: row.merged_at ? new Date(String(row.merged_at)).toISOString() : null,
    fixedVia: row.fixed_via != null ? (row.fixed_via as PlatformDefectFixedVia) : null,
    prBatchId: row.pr_batch_id != null ? String(row.pr_batch_id) : null,
    firstSeenAt: new Date(String(row.first_seen_at)).toISOString(),
    fixStartedAt: row.fix_started_at ? new Date(String(row.fix_started_at)).toISOString() : null,
    lastFixDispatchSentAt: row.last_fix_dispatch_sent_at
      ? new Date(String(row.last_fix_dispatch_sent_at)).toISOString()
      : null,
    readyForPrAt: row.ready_for_pr_at ? new Date(String(row.ready_for_pr_at)).toISOString() : null,
    fixedAt: row.fixed_at ? new Date(String(row.fixed_at)).toISOString() : null,
    lastFailureKind:
      row.last_failure_kind != null ? (String(row.last_failure_kind) as PlatformDefectFailureKind) : null,
    lastFailureSummary: row.last_failure_summary != null ? String(row.last_failure_summary) : null,
    lastCorrectionFailureDetails: mapCorrectionFailureDetails(row.last_correction_failure_details),
    correctionFailedAt: row.correction_failed_at
      ? new Date(String(row.correction_failed_at)).toISOString()
      : null,
    createdAt: new Date(String(row.created_at)).toISOString(),
    updatedAt: new Date(String(row.updated_at)).toISOString(),
    incidentCount: row.incident_count != null ? Number(row.incident_count) : undefined,
    parentDefectId: row.parent_defect_id != null ? String(row.parent_defect_id) : null,
    parentReferenceCode:
      row.parent_reference_code != null ? String(row.parent_reference_code) : null,
    lastPrReviewId: row.last_pr_review_id != null ? String(row.last_pr_review_id) : null,
    lastPrReviewRecommendation:
      row.last_pr_review_recommendation != null
        ? String(row.last_pr_review_recommendation)
        : null,
    lastPrReviewAt: row.last_pr_review_at
      ? new Date(String(row.last_pr_review_at)).toISOString()
      : null,
    operatorPrApprovedAt: row.operator_pr_approved_at
      ? new Date(String(row.operator_pr_approved_at)).toISOString()
      : null,
    operatorPrApprovedNote:
      row.operator_pr_approved_note != null ? String(row.operator_pr_approved_note) : null,
    operatorChangesRequestedAt: row.operator_changes_requested_at
      ? new Date(String(row.operator_changes_requested_at)).toISOString()
      : null,
    operatorChangesRequestedNote:
      row.operator_changes_requested_note != null
        ? String(row.operator_changes_requested_note)
        : null,
    pipelineStatus:
      row.pipeline_status != null ? (String(row.pipeline_status) as DefectPipelineStatus) : null,
    lastFailureDetails: mapJsonObject(row.last_failure_details),
    lastCiRunUrl: row.last_ci_run_url != null ? String(row.last_ci_run_url) : null,
    lastCiSnapshot: mapJsonObject(row.last_ci_snapshot),
    lastCiCheckedAt: row.last_ci_checked_at
      ? new Date(String(row.last_ci_checked_at)).toISOString()
      : null,
  }
}

const DEFECT_SELECT_WITH_PARENT = `d.*,
  parent.reference_code AS parent_reference_code`
const DEFECT_FROM_WITH_PARENT = `FROM platform_defects d
  LEFT JOIN platform_defects parent ON parent.id = d.parent_defect_id`

export class PlatformDefectPgRepository {
  constructor(private readonly pool: Pool) {}

  getDbPool(): Pool {
    return this.pool
  }

  async insert(input: CreatePlatformDefectInput): Promise<PlatformDefectRecord> {
    const referenceCode = await allocateOpsReferenceCode(this.pool, 'defect')
    const res = await this.pool.query(
      `INSERT INTO platform_defects (
        reference_code, title, fingerprint, impact, applications, owner_subject,
        triage_summary, triage_artifact_path, parent_defect_id
      ) VALUES ($1, $2, $3, $4, $5::jsonb, $6, $7, $8, $9::uuid)
      RETURNING *`,
      [
        referenceCode,
        input.title.slice(0, 2000),
        input.fingerprint?.slice(0, 128) ?? null,
        input.impact ?? null,
        JSON.stringify(input.applications ?? []),
        input.ownerSubject?.slice(0, 128) ?? null,
        input.triageSummary?.slice(0, 8000) ?? null,
        input.triageArtifactPath?.slice(0, 512) ?? null,
        input.parentDefectId ?? null,
      ],
    )
    return mapRow(res.rows[0] as Record<string, unknown>)
  }

  async markFixDispatchSent(id: string): Promise<PlatformDefectRecord | null> {
    const res = await this.pool.query(
      `UPDATE platform_defects SET
        last_fix_dispatch_sent_at = NOW(),
        last_failure_kind = NULL,
        last_failure_summary = NULL,
        last_correction_failure_details = NULL,
        correction_failed_at = NULL,
        updated_at = NOW()
      WHERE id = $1::uuid
      RETURNING *`,
      [id],
    )
    if (!res.rows[0]) return null
    return mapRow(res.rows[0] as Record<string, unknown>)
  }

  async findById(id: string): Promise<PlatformDefectRecord | null> {
    const res = await this.pool.query(`SELECT * FROM platform_defects WHERE id = $1::uuid`, [id])
    if (!res.rows[0]) return null
    return mapRow(res.rows[0] as Record<string, unknown>)
  }

  async findByReferenceCode(referenceCode: string): Promise<PlatformDefectRecord | null> {
    const normalized = normalizeDefectReferenceCode(referenceCode)
    if (!normalized) return null
    const res = await this.pool.query(
      `SELECT * FROM platform_defects WHERE reference_code = $1 LIMIT 1`,
      [normalized],
    )
    if (!res.rows[0]) return null
    return mapRow(res.rows[0] as Record<string, unknown>)
  }

  async searchForOps(query: string, limit = 50): Promise<PlatformDefectRecord[]> {
    const trimmed = query.trim()
    if (!trimmed) return []
    const ref = normalizeDefectReferenceCode(trimmed)
    if (ref) {
      const one = await this.findByReferenceCode(ref)
      return one ? [one] : []
    }
    const params: unknown[] = []
    let where = ''
    if (/^[0-9a-f-]{8,36}$/i.test(trimmed)) {
      params.push(`${trimmed.toLowerCase()}%`)
      where = `d.id::text LIKE $1`
    } else {
      params.push(`%${trimmed.slice(0, 200)}%`)
      where = `d.title ILIKE $1`
    }
    params.push(limit)
    const res = await this.pool.query(
      `SELECT ${DEFECT_SELECT_WITH_PARENT},
        (SELECT COUNT(*)::int FROM platform_defect_incidents i WHERE i.defect_id = d.id) AS incident_count
       ${DEFECT_FROM_WITH_PARENT}
       WHERE ${where}
       ORDER BY d.updated_at DESC
       LIMIT $2`,
      params,
    )
    return res.rows.map((row) => mapRow(row as Record<string, unknown>))
  }

  async findByIdWithIncidents(
    id: string,
  ): Promise<{
    defect: PlatformDefectRecord
    incidents: Array<{ id: string; title: string; referenceCode: string | null }>
  } | null> {
    const defect = await this.findById(id)
    if (!defect) return null
    const res = await this.pool.query<{
      id: string
      title: string
      reference_code: string | null
    }>(
      `SELECT q.id::text AS id, q.title, q.reference_code
       FROM platform_defect_incidents pdi
       JOIN ops_analysis_queue q ON q.id = pdi.incident_id
       WHERE pdi.defect_id = $1::uuid
       ORDER BY pdi.linked_at DESC`,
      [id],
    )
    return {
      defect,
      incidents: res.rows.map((row) => ({
        id: row.id,
        title: row.title,
        referenceCode: row.reference_code != null ? String(row.reference_code) : null,
      })),
    }
  }

  async findLatestFixedByFingerprint(fingerprint: string): Promise<PlatformDefectRecord | null> {
    const res = await this.pool.query(
      `SELECT * FROM platform_defects
       WHERE fingerprint = $1
         AND status = 'fixed'
         AND fixed_at IS NOT NULL
       ORDER BY fixed_at DESC
       LIMIT 1`,
      [fingerprint.slice(0, 128)],
    )
    if (!res.rows[0]) return null
    return mapRow(res.rows[0] as Record<string, unknown>)
  }

  async findOpenByFingerprint(fingerprint: string): Promise<PlatformDefectRecord | null> {
    const res = await this.pool.query(
      `SELECT * FROM platform_defects
       WHERE fingerprint = $1
         AND status IN ('open', 'in_fix', 'ready_for_pr')
       ORDER BY updated_at DESC
       LIMIT 1`,
      [fingerprint.slice(0, 128)],
    )
    if (!res.rows[0]) return null
    return mapRow(res.rows[0] as Record<string, unknown>)
  }

  async listLinkedIncidentIds(defectId: string): Promise<string[]> {
    const res = await this.pool.query<{ id: string }>(
      `SELECT incident_id::text AS id
       FROM platform_defect_incidents
       WHERE defect_id = $1::uuid
       ORDER BY linked_at DESC`,
      [defectId],
    )
    return res.rows.map((row) => row.id)
  }

  /** N:1 links for CH incident list (defect ref + status per incident). */
  async listDefectLinksByIncidentIds(
    incidentIds: string[],
  ): Promise<Map<string, Array<{ id: string; referenceCode: string | null; status: PlatformDefectStatus }>>> {
    const map = new Map<
      string,
      Array<{ id: string; referenceCode: string | null; status: PlatformDefectStatus }>
    >()
    if (!incidentIds.length) return map

    const res = await this.pool.query<{
      incident_id: string
      defect_id: string
      reference_code: string | null
      status: PlatformDefectStatus
    }>(
      `SELECT
         pdi.incident_id::text AS incident_id,
         d.id::text AS defect_id,
         d.reference_code,
         d.status
       FROM platform_defect_incidents pdi
       JOIN platform_defects d ON d.id = pdi.defect_id
       WHERE pdi.incident_id = ANY($1::uuid[])
       ORDER BY pdi.linked_at DESC`,
      [incidentIds],
    )

    for (const row of res.rows) {
      const list = map.get(row.incident_id) ?? []
      list.push({
        id: row.defect_id,
        referenceCode: row.reference_code,
        status: row.status,
      })
      map.set(row.incident_id, list)
    }
    return map
  }

  async linkIncident(
    defectId: string,
    incidentId: string,
    linkedBy: PlatformDefectIncidentLinkedBy,
  ): Promise<void> {
    await this.pool.query(
      `INSERT INTO platform_defect_incidents (defect_id, incident_id, linked_by)
       VALUES ($1::uuid, $2::uuid, $3)
       ON CONFLICT (defect_id, incident_id) DO NOTHING`,
      [defectId, incidentId, linkedBy.slice(0, 64)],
    )
  }

  async listForOps(options: {
    statuses?: PlatformDefectStatus[]
    includeFixed?: boolean
    limit?: number
  } = {}): Promise<PlatformDefectRecord[]> {
    const limit = options.limit ?? 100
    const statuses = options.statuses?.length
      ? options.statuses
      : options.includeFixed
        ? ['open', 'in_fix', 'ready_for_pr', 'fixed']
        : ['open', 'in_fix', 'ready_for_pr']

    const res = await this.pool.query(
      `SELECT ${DEFECT_SELECT_WITH_PARENT},
        (SELECT COUNT(*)::int FROM platform_defect_incidents i WHERE i.defect_id = d.id) AS incident_count
       ${DEFECT_FROM_WITH_PARENT}
       WHERE d.status = ANY($1::text[])
       ORDER BY d.updated_at DESC
       LIMIT $2`,
      [statuses, limit],
    )
    return res.rows.map((row) => mapRow(row as Record<string, unknown>))
  }

  async findActiveDefectsByPrUrls(normalizedPrUrls: string[]): Promise<PlatformDefectRecord[]> {
    if (!normalizedPrUrls.length) return []
    const res = await this.pool.query(
      `SELECT * FROM platform_defects
       WHERE pr_url IS NOT NULL
         AND lower(regexp_replace(trim(pr_url), '/+$', '')) = ANY($1::text[])
         AND status IN ('ready_for_pr', 'in_fix')
       ORDER BY updated_at DESC`,
      [normalizedPrUrls],
    )
    return res.rows.map((row) => mapRow(row as Record<string, unknown>))
  }

  async applyCiPipelineSnapshot(
    id: string,
    input: {
      pipelineStatus: DefectPipelineStatus
      lastCiRunUrl: string | null
      lastCiSnapshot: DefectPipelineFailureDetails
      failureKind?: PlatformDefectFailureKind
      failureSummary?: string
      failureDetails?: DefectPipelineFailureDetails
    },
  ): Promise<PlatformDefectRecord | null> {
    const withFailure =
      input.failureKind && input.failureSummary && input.failureDetails
    const failurePatch = withFailure
      ? `last_failure_kind = $5,
          last_failure_summary = $6,
          last_failure_details = $7::jsonb,`
      : ''
    const res = await this.pool.query(
      `UPDATE platform_defects SET
        pipeline_status = $2,
        last_ci_run_url = $3,
        last_ci_snapshot = $4::jsonb,
        last_ci_checked_at = NOW(),
        ${failurePatch}
        updated_at = NOW()
      WHERE id = $1::uuid
        AND status IN ('ready_for_pr', 'in_fix')
      RETURNING *`,
      withFailure
        ? [
            id,
            input.pipelineStatus,
            input.lastCiRunUrl?.slice(0, 512) ?? null,
            JSON.stringify(input.lastCiSnapshot),
            input.failureKind,
            input.failureSummary.slice(0, 2000),
            JSON.stringify(input.failureDetails),
          ]
        : [
            id,
            input.pipelineStatus,
            input.lastCiRunUrl?.slice(0, 512) ?? null,
            JSON.stringify(input.lastCiSnapshot),
          ],
    )
    if (!res.rows[0]) return null
    return mapRow(res.rows[0] as Record<string, unknown>)
  }

  async applyCiFailureReopen(
    id: string,
    input: {
      failureSummary: string
      failureDetails: DefectPipelineFailureDetails
      correctionFailureDetails: CorrectionFailureDetails
      lastCiRunUrl: string | null
      lastCiSnapshot: DefectPipelineFailureDetails
    },
  ): Promise<PlatformDefectRecord | null> {
    const res = await this.pool.query(
      `UPDATE platform_defects SET
        status = 'in_fix',
        pipeline_status = 'ci_failed',
        last_failure_kind = 'ci',
        last_failure_summary = $2,
        last_failure_details = $3::jsonb,
        last_correction_failure_details = $4::jsonb,
        last_ci_run_url = $5,
        last_ci_snapshot = $6::jsonb,
        last_ci_checked_at = NOW(),
        updated_at = NOW()
      WHERE id = $1::uuid
        AND status = 'ready_for_pr'
      RETURNING *`,
      [
        id,
        input.failureSummary.slice(0, 2000),
        JSON.stringify(input.failureDetails),
        JSON.stringify(input.correctionFailureDetails),
        input.lastCiRunUrl?.slice(0, 512) ?? null,
        JSON.stringify(input.lastCiSnapshot),
      ],
    )
    if (!res.rows[0]) return null
    return mapRow(res.rows[0] as Record<string, unknown>)
  }

  async findMergeCandidates(input: {
    mergedPrUrl: string
    referenceCodes: string[]
    defectIds: string[]
  }): Promise<PlatformDefectRecord[]> {
    const normalizedPr = normalizeGithubPrUrlForMatch(input.mergedPrUrl)
    if (!normalizedPr) return []

    const byId = new Map<string, PlatformDefectRecord>()

    const prRes = await this.pool.query(
      `SELECT * FROM platform_defects
       WHERE pr_url IS NOT NULL
         AND lower(regexp_replace(trim(pr_url), '/+$', '')) = $1`,
      [normalizedPr],
    )
    for (const row of prRes.rows) {
      const mapped = mapRow(row as Record<string, unknown>)
      byId.set(mapped.id, mapped)
    }

    for (const ref of input.referenceCodes) {
      const one = await this.findByReferenceCode(ref)
      if (one) byId.set(one.id, one)
    }

    for (const defectId of input.defectIds) {
      const one = await this.findById(defectId)
      if (one) byId.set(one.id, one)
    }

    return [...byId.values()].filter((d) =>
      d.status === 'ready_for_pr' || d.status === 'in_fix' || d.status === 'fixed',
    )
  }

  async applyGithubMergeFixed(
    id: string,
    mergedPrUrl: string,
  ): Promise<{ record: PlatformDefectRecord; wasAlreadyFixed: boolean } | null> {
    const existing = await this.findById(id)
    if (!existing) return null

    const normalized = normalizeGithubPrUrlForMatch(mergedPrUrl)
    if (!normalized) return null

    if (existing.status === 'fixed') {
      const sameMerge =
        normalizeGithubPrUrlForMatch(existing.mergedPrUrl) === normalized ||
        normalizeGithubPrUrlForMatch(existing.prUrl) === normalized
      if (sameMerge) return { record: existing, wasAlreadyFixed: true }
      return null
    }

    if (existing.status !== 'ready_for_pr' && existing.status !== 'in_fix') {
      return null
    }

    const res = await this.pool.query(
      `UPDATE platform_defects SET
        status = 'fixed',
        fixed_at = COALESCE(fixed_at, NOW()),
        merged_at = COALESCE(merged_at, NOW()),
        merged_pr_url = COALESCE(merged_pr_url, $2),
        pr_url = COALESCE(pr_url, $2),
        fixed_via = COALESCE(fixed_via, 'github_webhook'),
        updated_at = NOW()
      WHERE id = $1::uuid
        AND status IN ('ready_for_pr', 'in_fix')
      RETURNING *`,
      [id, mergedPrUrl.slice(0, 512)],
    )
    if (!res.rows[0]) return null
    return { record: mapRow(res.rows[0] as Record<string, unknown>), wasAlreadyFixed: false }
  }

  async updateStatus(
    id: string,
    status: PlatformDefectStatus,
    meta?: {
      branchName?: string | null
      prUrl?: string | null
      prBatchId?: string | null
      markFixDispatchSent?: boolean
      clearFixProgress?: boolean
      fixedVia?: PlatformDefectFixedVia | null
      mergedPrUrl?: string | null
    },
  ): Promise<PlatformDefectRecord | null> {
    const fixStarted =
      status === 'in_fix'
        ? `fix_started_at = COALESCE(fix_started_at, NOW()),
        last_failure_kind = NULL,
        last_failure_summary = NULL,
        last_correction_failure_details = NULL,
        correction_failed_at = NULL,`
        : ''
    const markDispatch = meta?.markFixDispatchSent
      ? 'last_fix_dispatch_sent_at = NOW(),'
      : ''
    const clearFix = meta?.clearFixProgress
      ? 'fix_started_at = NULL, last_fix_dispatch_sent_at = NULL,'
      : ''
    const readyForPr =
      status === 'ready_for_pr' ? 'ready_for_pr_at = COALESCE(ready_for_pr_at, NOW()),' : ''
    const fixed = status === 'fixed' ? 'fixed_at = COALESCE(fixed_at, NOW()),' : ''
    const manualFixed =
      status === 'fixed' && meta?.fixedVia === 'manual'
        ? `fixed_via = COALESCE(fixed_via, 'manual'),
           merged_at = COALESCE(merged_at, NOW()),
           merged_pr_url = COALESCE(merged_pr_url, pr_url, $4),`
        : ''

    const res = await this.pool.query(
      `UPDATE platform_defects SET
        status = $2,
        ${fixStarted}
        ${markDispatch}
        ${clearFix}
        ${readyForPr}
        ${fixed}
        ${manualFixed}
        branch_name = COALESCE($3, branch_name),
        pr_url = COALESCE($4, pr_url),
        pr_batch_id = COALESCE($5::uuid, pr_batch_id),
        updated_at = NOW()
      WHERE id = $1::uuid
      RETURNING *`,
      [
        id,
        status,
        meta?.branchName?.slice(0, 256) ?? null,
        meta?.prUrl?.slice(0, 512) ?? null,
        meta?.prBatchId ?? null,
      ],
    )
    if (!res.rows[0]) return null
    return mapRow(res.rows[0] as Record<string, unknown>)
  }

  async recordCorrectionFailure(
    id: string,
    input: {
      failureKind: PlatformDefectFailureKind
      failureSummary: string
      failureDetails: CorrectionFailureDetails
    },
  ): Promise<PlatformDefectRecord | null> {
    const res = await this.pool.query(
      `UPDATE platform_defects SET
        status = 'open',
        fix_started_at = NULL,
        last_fix_dispatch_sent_at = NULL,
        last_failure_kind = $2,
        last_failure_summary = $3,
        last_correction_failure_details = $4::jsonb,
        correction_failed_at = NOW(),
        updated_at = NOW()
      WHERE id = $1::uuid
        AND status = 'in_fix'
      RETURNING *`,
      [
        id,
        input.failureKind,
        input.failureSummary.slice(0, 2000),
        JSON.stringify(input.failureDetails),
      ],
    )
    if (!res.rows[0]) return null
    return mapRow(res.rows[0] as Record<string, unknown>)
  }

  async listLinkedIncidentsMeta(
    incidentIds: string[],
  ): Promise<Array<{ id: string; referenceCode: string | null; fingerprint: string | null }>> {
    if (!incidentIds.length) return []
    const res = await this.pool.query<{
      id: string
      reference_code: string | null
      fingerprint: string | null
    }>(
      `SELECT q.id::text AS id, q.reference_code, q.context_snapshot->>'fingerprint' AS fingerprint
       FROM ops_analysis_queue q
       WHERE q.id = ANY($1::uuid[])
       ORDER BY array_position($1::uuid[], q.id)`,
      [incidentIds],
    )
    return res.rows.map((row) => ({
      id: row.id,
      referenceCode: row.reference_code != null ? String(row.reference_code) : null,
      fingerprint: row.fingerprint != null ? String(row.fingerprint) : null,
    }))
  }

  async recordOperatorPrApproval(id: string, note: string | null): Promise<void> {
    await this.pool.query(
      `UPDATE platform_defects SET
        operator_pr_approved_at = NOW(),
        operator_pr_approved_note = $2,
        pipeline_status = 'approved_for_merge',
        updated_at = NOW()
      WHERE id = $1::uuid`,
      [id, note?.slice(0, 4000) ?? null],
    )
  }

  async recordOperatorChangesRequested(id: string, note: string | null): Promise<void> {
    await this.pool.query(
      `UPDATE platform_defects SET
        operator_changes_requested_at = NOW(),
        operator_changes_requested_note = $2,
        updated_at = NOW()
      WHERE id = $1::uuid`,
      [id, note?.slice(0, 4000) ?? null],
    )
  }
}
