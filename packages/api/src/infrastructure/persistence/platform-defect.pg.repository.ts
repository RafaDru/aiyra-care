import type { Pool } from 'pg'
import type {
  CreatePlatformDefectInput,
  PlatformDefectIncidentLinkedBy,
  PlatformDefectRecord,
  PlatformDefectStatus,
} from '../../domain/ops/platform-defect.types.js'

function mapRow(row: Record<string, unknown>): PlatformDefectRecord {
  const apps = row.applications
  return {
    id: String(row.id),
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
    prBatchId: row.pr_batch_id != null ? String(row.pr_batch_id) : null,
    firstSeenAt: new Date(String(row.first_seen_at)).toISOString(),
    fixStartedAt: row.fix_started_at ? new Date(String(row.fix_started_at)).toISOString() : null,
    readyForPrAt: row.ready_for_pr_at ? new Date(String(row.ready_for_pr_at)).toISOString() : null,
    fixedAt: row.fixed_at ? new Date(String(row.fixed_at)).toISOString() : null,
    createdAt: new Date(String(row.created_at)).toISOString(),
    updatedAt: new Date(String(row.updated_at)).toISOString(),
    incidentCount: row.incident_count != null ? Number(row.incident_count) : undefined,
  }
}

export class PlatformDefectPgRepository {
  constructor(private readonly pool: Pool) {}

  async insert(input: CreatePlatformDefectInput): Promise<PlatformDefectRecord> {
    const res = await this.pool.query(
      `INSERT INTO platform_defects (
        title, fingerprint, impact, applications, owner_subject,
        triage_summary, triage_artifact_path
      ) VALUES ($1, $2, $3, $4::jsonb, $5, $6, $7)
      RETURNING *`,
      [
        input.title.slice(0, 2000),
        input.fingerprint?.slice(0, 128) ?? null,
        input.impact ?? null,
        JSON.stringify(input.applications ?? []),
        input.ownerSubject?.slice(0, 128) ?? null,
        input.triageSummary?.slice(0, 8000) ?? null,
        input.triageArtifactPath?.slice(0, 512) ?? null,
      ],
    )
    return mapRow(res.rows[0] as Record<string, unknown>)
  }

  async findById(id: string): Promise<PlatformDefectRecord | null> {
    const res = await this.pool.query(`SELECT * FROM platform_defects WHERE id = $1::uuid`, [id])
    if (!res.rows[0]) return null
    return mapRow(res.rows[0] as Record<string, unknown>)
  }

  async findByIdWithIncidents(
    id: string,
  ): Promise<{ defect: PlatformDefectRecord; incidents: Array<{ id: string; title: string }> } | null> {
    const defect = await this.findById(id)
    if (!defect) return null
    const res = await this.pool.query<{ id: string; title: string }>(
      `SELECT q.id::text AS id, q.title
       FROM platform_defect_incidents pdi
       JOIN ops_analysis_queue q ON q.id = pdi.incident_id
       WHERE pdi.defect_id = $1::uuid
       ORDER BY pdi.linked_at DESC`,
      [id],
    )
    return { defect, incidents: res.rows }
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
      `SELECT d.*,
        (SELECT COUNT(*)::int FROM platform_defect_incidents i WHERE i.defect_id = d.id) AS incident_count
       FROM platform_defects d
       WHERE d.status = ANY($1::text[])
       ORDER BY d.updated_at DESC
       LIMIT $2`,
      [statuses, limit],
    )
    return res.rows.map((row) => mapRow(row as Record<string, unknown>))
  }

  async updateStatus(
    id: string,
    status: PlatformDefectStatus,
    meta?: { branchName?: string | null; prUrl?: string | null; prBatchId?: string | null },
  ): Promise<PlatformDefectRecord | null> {
    const fixStarted = status === 'in_fix' ? 'fix_started_at = COALESCE(fix_started_at, NOW()),' : ''
    const readyForPr =
      status === 'ready_for_pr' ? 'ready_for_pr_at = COALESCE(ready_for_pr_at, NOW()),' : ''
    const fixed = status === 'fixed' ? 'fixed_at = COALESCE(fixed_at, NOW()),' : ''

    const res = await this.pool.query(
      `UPDATE platform_defects SET
        status = $2,
        ${fixStarted}
        ${readyForPr}
        ${fixed}
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
}
