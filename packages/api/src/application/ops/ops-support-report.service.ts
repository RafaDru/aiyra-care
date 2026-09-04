import type { SupportReportPgRepository } from '../../infrastructure/persistence/support-report.pg.repository.js'
import type { SupportReportStatus } from '../../domain/support-report/support-report.types.js'

export interface SupportReportOpsRow {
  id: string
  accountId: string
  status: SupportReportStatus
  category: string
  route: string | null
  descriptionPreview: string | null
  consentTechnical: boolean
  consentProfileAccess: boolean
  hasScreenshot: boolean
  appVersion: string | null
  createdAt: string
  expiresAt: string
  diagnosticContext: Record<string, unknown>
}

export class OpsSupportReportService {
  constructor(private readonly repo: SupportReportPgRepository) {}

  async list(status: SupportReportStatus = 'open', limit = 50): Promise<SupportReportOpsRow[]> {
    const rows = await this.repo.listForOps(status, limit)
    return rows.map((row) => ({
      id: row.id,
      accountId: row.accountId,
      status: row.status,
      category: row.category,
      route: row.route,
      descriptionPreview: row.description ? row.description.slice(0, 120) : null,
      consentTechnical: row.consentTechnical,
      consentProfileAccess: row.consentProfileAccess,
      hasScreenshot: row.hasScreenshot,
      appVersion: row.appVersion,
      createdAt: row.createdAt.toISOString(),
      expiresAt: row.expiresAt.toISOString(),
      diagnosticContext: row.consentTechnical ? row.diagnosticContext : {},
    }))
  }

  async updateStatus(id: string, status: 'triaged' | 'resolved' | 'closed'): Promise<boolean> {
    return this.repo.updateStatusForOps(id, status)
  }
}
