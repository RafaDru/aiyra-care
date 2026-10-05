import type { Pool } from 'pg'
import type {
  DefectPrReviewDimensions,
  DefectPrReviewRecord,
  DefectPrReviewRecommendation,
  DefectPrReviewStatus,
  DefectPrReviewSummary,
  DefectPrReviewTrigger,
} from '../../domain/ops/defect-pr-review.types.js'

function mapDimensions(value: unknown): DefectPrReviewDimensions | null {
  if (!value || typeof value !== 'object') return null
  return value as DefectPrReviewDimensions
}

function mapRow(row: Record<string, unknown>): DefectPrReviewRecord {
  return {
    id: String(row.id),
    defectId: String(row.defect_id),
    status: row.status as DefectPrReviewStatus,
    trigger: row.trigger as DefectPrReviewTrigger,
    prUrl: String(row.pr_url),
    branchName: row.branch_name != null ? String(row.branch_name) : null,
    headSha: row.head_sha != null ? String(row.head_sha) : null,
    investigationId: row.investigation_id != null ? String(row.investigation_id) : null,
    dimensions: mapDimensions(row.dimensions),
    recommendation:
      row.recommendation != null ? (row.recommendation as DefectPrReviewRecommendation) : null,
    recommendationRationale:
      row.recommendation_rationale != null ? String(row.recommendation_rationale) : null,
    ciSnapshot:
      row.ci_snapshot && typeof row.ci_snapshot === 'object'
        ? (row.ci_snapshot as Record<string, unknown>)
        : null,
    prReviewCommentUrl:
      row.pr_review_comment_url != null ? String(row.pr_review_comment_url) : null,
    agentRunUrl: row.agent_run_url != null ? String(row.agent_run_url) : null,
    failureDetails:
      row.failure_details && typeof row.failure_details === 'object'
        ? (row.failure_details as Record<string, unknown>)
        : null,
    rawJson:
      row.raw_json && typeof row.raw_json === 'object'
        ? (row.raw_json as Record<string, unknown>)
        : null,
    startedAt: row.started_at ? new Date(String(row.started_at)).toISOString() : null,
    completedAt: row.completed_at ? new Date(String(row.completed_at)).toISOString() : null,
    createdAt: new Date(String(row.created_at)).toISOString(),
  }
}

export function toDefectPrReviewSummary(record: DefectPrReviewRecord): DefectPrReviewSummary {
  const dims = record.dimensions
  return {
    id: record.id,
    status: record.status,
    recommendation: record.recommendation,
    correctionEffectiveness: dims?.correctionEffectiveness?.verdict ?? null,
    riskLevel: dims?.risk?.level ?? null,
    riskSummary: dims?.risk?.summary ?? null,
    securityVerdict: dims?.security?.verdict ?? null,
    securitySummary: dims?.security?.summary ?? null,
    recommendationRationale: record.recommendationRationale,
    completedAt: record.completedAt,
    prReviewCommentUrl: record.prReviewCommentUrl,
    agentRunUrl: record.agentRunUrl,
  }
}

export class DefectPrReviewPgRepository {
  constructor(private readonly pool: Pool) {}

  async insertPending(input: {
    defectId: string
    trigger: DefectPrReviewTrigger
    prUrl: string
    branchName: string | null
    investigationId: string | null
  }): Promise<DefectPrReviewRecord> {
    const res = await this.pool.query(
      `INSERT INTO defect_pr_reviews (
        defect_id, status, trigger, pr_url, branch_name, investigation_id, started_at
      ) VALUES ($1::uuid, 'running', $2, $3, $4, $5::uuid, NOW())
      RETURNING *`,
      [
        input.defectId,
        input.trigger,
        input.prUrl,
        input.branchName,
        input.investigationId,
      ],
    )
    return mapRow(res.rows[0] as Record<string, unknown>)
  }

  async findById(id: string): Promise<DefectPrReviewRecord | null> {
    const res = await this.pool.query(`SELECT * FROM defect_pr_reviews WHERE id = $1::uuid`, [id])
    if (!res.rows[0]) return null
    return mapRow(res.rows[0] as Record<string, unknown>)
  }

  async findLatestByDefectId(defectId: string): Promise<DefectPrReviewRecord | null> {
    const res = await this.pool.query(
      `SELECT * FROM defect_pr_reviews
       WHERE defect_id = $1::uuid
       ORDER BY COALESCE(completed_at, started_at, created_at) DESC
       LIMIT 1`,
      [defectId],
    )
    if (!res.rows[0]) return null
    return mapRow(res.rows[0] as Record<string, unknown>)
  }

  async findLatestByDefectIds(defectIds: string[]): Promise<Map<string, DefectPrReviewRecord>> {
    const map = new Map<string, DefectPrReviewRecord>()
    if (!defectIds.length) return map
    const res = await this.pool.query(
      `SELECT DISTINCT ON (defect_id) *
       FROM defect_pr_reviews
       WHERE defect_id = ANY($1::uuid[])
       ORDER BY defect_id, COALESCE(completed_at, started_at, created_at) DESC`,
      [defectIds],
    )
    for (const row of res.rows) {
      const record = mapRow(row as Record<string, unknown>)
      map.set(record.defectId, record)
    }
    return map
  }

  async findRunningByDefectId(defectId: string): Promise<DefectPrReviewRecord | null> {
    const res = await this.pool.query(
      `SELECT * FROM defect_pr_reviews
       WHERE defect_id = $1::uuid AND status IN ('pending', 'running')
       ORDER BY created_at DESC
       LIMIT 1`,
      [defectId],
    )
    if (!res.rows[0]) return null
    return mapRow(res.rows[0] as Record<string, unknown>)
  }

  async findRunningByDefectIdAndPrUrl(
    defectId: string,
    prUrl: string,
  ): Promise<DefectPrReviewRecord | null> {
    const res = await this.pool.query(
      `SELECT * FROM defect_pr_reviews
       WHERE defect_id = $1::uuid AND pr_url = $2 AND status IN ('pending', 'running')
       ORDER BY created_at DESC
       LIMIT 1`,
      [defectId, prUrl],
    )
    if (!res.rows[0]) return null
    return mapRow(res.rows[0] as Record<string, unknown>)
  }

  async findLatestCompletedForPrUrl(
    defectId: string,
    prUrl: string,
  ): Promise<DefectPrReviewRecord | null> {
    const res = await this.pool.query(
      `SELECT * FROM defect_pr_reviews
       WHERE defect_id = $1::uuid AND pr_url = $2 AND status = 'completed'
       ORDER BY completed_at DESC NULLS LAST
       LIMIT 1`,
      [defectId, prUrl],
    )
    if (!res.rows[0]) return null
    return mapRow(res.rows[0] as Record<string, unknown>)
  }

  async findLatestTerminalCompletedAt(defectId: string): Promise<string | null> {
    const res = await this.pool.query<{ completed_at: Date | null }>(
      `SELECT completed_at FROM defect_pr_reviews
       WHERE defect_id = $1::uuid AND status IN ('completed', 'failed')
       ORDER BY completed_at DESC NULLS LAST
       LIMIT 1`,
      [defectId],
    )
    const at = res.rows[0]?.completed_at
    return at ? new Date(at).toISOString() : null
  }

  async markFailed(id: string, failureDetails: Record<string, unknown>): Promise<DefectPrReviewRecord | null> {
    const res = await this.pool.query(
      `UPDATE defect_pr_reviews SET
        status = 'failed',
        failure_details = $2::jsonb,
        completed_at = NOW(),
        raw_json = COALESCE(raw_json, '{}'::jsonb) || $2::jsonb
      WHERE id = $1::uuid
      RETURNING *`,
      [id, JSON.stringify(failureDetails)],
    )
    if (!res.rows[0]) return null
    return mapRow(res.rows[0] as Record<string, unknown>)
  }

  async completeFromCallback(
    id: string,
    input: {
      dimensions?: DefectPrReviewDimensions | null
      recommendation?: DefectPrReviewRecommendation | null
      recommendationRationale?: string | null
      ciSnapshot?: Record<string, unknown> | null
      prReviewCommentUrl?: string | null
      agentRunUrl?: string | null
      headSha?: string | null
      rawJson: Record<string, unknown>
      status: 'completed' | 'failed'
      failureDetails?: Record<string, unknown> | null
    },
  ): Promise<DefectPrReviewRecord | null> {
    const res = await this.pool.query(
      `UPDATE defect_pr_reviews SET
        status = $2,
        dimensions = COALESCE($3::jsonb, dimensions),
        recommendation = $4,
        recommendation_rationale = $5,
        ci_snapshot = COALESCE($6::jsonb, ci_snapshot),
        pr_review_comment_url = COALESCE($7, pr_review_comment_url),
        agent_run_url = COALESCE($8, agent_run_url),
        head_sha = COALESCE($9, head_sha),
        failure_details = $10::jsonb,
        raw_json = $11::jsonb,
        completed_at = NOW()
      WHERE id = $1::uuid
      RETURNING *`,
      [
        id,
        input.status,
        input.dimensions ? JSON.stringify(input.dimensions) : null,
        input.recommendation ?? null,
        input.recommendationRationale?.slice(0, 8000) ?? null,
        input.ciSnapshot ? JSON.stringify(input.ciSnapshot) : null,
        input.prReviewCommentUrl?.slice(0, 512) ?? null,
        input.agentRunUrl?.slice(0, 512) ?? null,
        input.headSha?.slice(0, 128) ?? null,
        input.failureDetails ? JSON.stringify(input.failureDetails) : null,
        JSON.stringify(input.rawJson),
      ],
    )
    if (!res.rows[0]) return null
    return mapRow(res.rows[0] as Record<string, unknown>)
  }

  async syncDefectLastReview(
    defectId: string,
    reviewId: string,
    recommendation: DefectPrReviewRecommendation | null,
  ): Promise<void> {
    await this.pool.query(
      `UPDATE platform_defects SET
        last_pr_review_id = $2::uuid,
        last_pr_review_recommendation = $3,
        last_pr_review_at = NOW(),
        updated_at = NOW()
      WHERE id = $1::uuid`,
      [defectId, reviewId, recommendation],
    )
  }
}
