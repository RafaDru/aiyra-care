import type { Pool } from 'pg'
import type { SupportReportRepository } from '../../domain/support-report/support-report.repository.js'
import type {
  CreateSupportReportInput,
  SupportReportRecord,
} from '../../domain/support-report/support-report.types.js'

function mapRow(row: Record<string, unknown>): SupportReportRecord {
  return {
    id: row.id as string,
    accountId: row.account_id as string,
    status: row.status as SupportReportRecord['status'],
    category: row.category as SupportReportRecord['category'],
    description: row.description as string | null,
    route: row.route as string | null,
    sessionId: row.session_id as string | null,
    patientId: row.patient_id as string | null,
    consentTechnical: Boolean(row.consent_technical),
    consentScreenshot: Boolean(row.consent_screenshot),
    consentProfileAccess: Boolean(row.consent_profile_access),
    profileAccessUntil: row.profile_access_until
      ? new Date(row.profile_access_until as string)
      : null,
    diagnosticContext: (row.diagnostic_context as Record<string, unknown>) ?? {},
    hasScreenshot: Boolean(row.screenshot_data),
    appVersion: row.app_version as string | null,
    userAgent: row.user_agent as string | null,
    expiresAt: new Date(row.expires_at as string),
    resolvedAt: row.resolved_at ? new Date(row.resolved_at as string) : null,
    createdAt: new Date(row.created_at as string),
    updatedAt: new Date(row.updated_at as string),
  }
}

export class SupportReportPgRepository implements SupportReportRepository {
  constructor(private readonly pool: Pool) {}

  async insert(row: {
    accountId: string
    category: CreateSupportReportInput['category']
    description: string | null
    route?: string
    sessionId?: string
    patientId?: string
    consentTechnical: boolean
    consentScreenshot: boolean
    consentProfileAccess: boolean
    screenshotData?: string
    appVersion?: string
    userAgent?: string
    diagnosticContext: Record<string, unknown>
    profileAccessUntil: Date | null
    expiresAt: Date
  }): Promise<SupportReportRecord> {
    const { rows } = await this.pool.query(
      `INSERT INTO support_reports (
         account_id, category, description, route, session_id, patient_id,
         consent_technical, consent_screenshot, consent_profile_access,
         profile_access_until, diagnostic_context, screenshot_data,
         app_version, user_agent, expires_at
       ) VALUES (
         $1, $2, $3, $4, $5, $6,
         $7, $8, $9,
         $10, $11::jsonb, $12,
         $13, $14, $15
       )
       RETURNING *`,
      [
        row.accountId,
        row.category,
        row.description,
        row.route?.slice(0, 256) ?? null,
        row.sessionId?.slice(0, 64) ?? null,
        row.patientId ?? null,
        row.consentTechnical,
        row.consentScreenshot,
        row.consentProfileAccess,
        row.profileAccessUntil,
        JSON.stringify(row.diagnosticContext),
        row.screenshotData ?? null,
        row.appVersion?.slice(0, 64) ?? null,
        row.userAgent?.slice(0, 256) ?? null,
        row.expiresAt,
      ],
    )
    return mapRow(rows[0])
  }

  async listByAccount(accountId: string, limit: number): Promise<SupportReportRecord[]> {
    const { rows } = await this.pool.query(
      `SELECT id, account_id, status, category, description, route, session_id, patient_id,
              consent_technical, consent_screenshot, consent_profile_access,
              profile_access_until, diagnostic_context,
              (screenshot_data IS NOT NULL) AS screenshot_data,
              app_version, user_agent, expires_at, resolved_at, created_at, updated_at
       FROM support_reports
       WHERE account_id = $1
       ORDER BY created_at DESC
       LIMIT $2`,
      [accountId, limit],
    )
    return rows.map((row) => mapRow({
      ...row,
      screenshot_data: row.screenshot_data ? '1' : null,
    }))
  }

  async findByIdForAccount(id: string, accountId: string): Promise<SupportReportRecord | null> {
    const { rows } = await this.pool.query(
      `SELECT id, account_id, status, category, description, route, session_id, patient_id,
              consent_technical, consent_screenshot, consent_profile_access,
              profile_access_until, diagnostic_context,
              (screenshot_data IS NOT NULL) AS screenshot_data,
              app_version, user_agent, expires_at, resolved_at, created_at, updated_at
       FROM support_reports
       WHERE id = $1 AND account_id = $2`,
      [id, accountId],
    )
    if (!rows[0]) return null
    return mapRow({
      ...rows[0],
      screenshot_data: rows[0].screenshot_data ? '1' : null,
    })
  }

  async fetchRecentProductEvents(
    accountId: string,
    sessionId: string | undefined,
    limit: number,
  ): Promise<unknown[]> {
    const { rows } = await this.pool.query(
      sessionId
        ? `SELECT event_name, route, created_at, properties
           FROM product_events
           WHERE account_id = $1
             AND (session_id = $2 OR created_at > NOW() - INTERVAL '2 hours')
           ORDER BY created_at DESC
           LIMIT $3`
        : `SELECT event_name, route, created_at, properties
           FROM product_events
           WHERE account_id = $1
             AND created_at > NOW() - INTERVAL '2 hours'
           ORDER BY created_at DESC
           LIMIT $2`,
      sessionId ? [accountId, sessionId.slice(0, 64), limit] : [accountId, limit],
    )
    return rows.map((row) => ({
      eventName: row.event_name,
      route: row.route,
      createdAt: row.created_at,
      properties: row.properties,
    }))
  }

  async fetchRecentClientErrors(accountId: string, limit: number): Promise<unknown[]> {
    const { rows } = await this.pool.query(
      `SELECT fingerprint, feature, error_kind, error_code, route, created_at, properties
       FROM client_errors
       WHERE account_id = $1
         AND created_at > NOW() - INTERVAL '24 hours'
       ORDER BY created_at DESC
       LIMIT $2`,
      [accountId, limit],
    )
    return rows
  }

  async fetchLastSyncFailure(patientId: string): Promise<unknown | null> {
    const { rows } = await this.pool.query(
      `SELECT sj.id, sj.status, sj.step, sj.error, sj.portal_type, sj.updated_at
       FROM sync_jobs sj
       JOIN integration_links il ON il.id = sj.integration_link_id
       WHERE il.patient_id = $1
         AND sj.status = 'failed'
       ORDER BY sj.updated_at DESC
       LIMIT 1`,
      [patientId],
    )
    if (!rows[0]) return null
    const row = rows[0]
    return {
      jobId: row.id,
      status: row.status,
      step: row.step,
      portalType: row.portal_type,
      errorCode: typeof row.error === 'string'
        ? row.error.slice(0, 128)
        : 'sync_failed',
      updatedAt: row.updated_at,
    }
  }

  async listForOps(
    status: SupportReportRecord['status'],
    limit: number,
  ): Promise<SupportReportRecord[]> {
    const { rows } = await this.pool.query(
      `SELECT id, account_id, status, category, description, route, session_id, patient_id,
              consent_technical, consent_screenshot, consent_profile_access,
              profile_access_until, diagnostic_context,
              (screenshot_data IS NOT NULL) AS screenshot_data,
              app_version, user_agent, expires_at, resolved_at, created_at, updated_at
       FROM support_reports
       WHERE status = $1
       ORDER BY created_at DESC
       LIMIT $2`,
      [status, limit],
    )
    return rows.map((row) => mapRow({
      ...row,
      screenshot_data: row.screenshot_data ? '1' : null,
    }))
  }

  async updateStatusForOps(
    id: string,
    status: SupportReportRecord['status'],
  ): Promise<boolean> {
    const { rowCount } = await this.pool.query(
      `UPDATE support_reports
       SET status = $2,
           resolved_at = CASE WHEN $2 IN ('resolved', 'closed') THEN NOW() ELSE resolved_at END,
           updated_at = NOW()
       WHERE id = $1`,
      [id, status],
    )
    return (rowCount ?? 0) > 0
  }
}
