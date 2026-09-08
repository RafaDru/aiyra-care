import type { SupportReportPgRepository } from '../../infrastructure/persistence/support-report.pg.repository.js'
import {
  analysisErrorFromInvestigatorResult,
  analysisStatusFromInvestigatorResult,
  dispatchSupportReportInvestigator,
} from '../support-report/support-report-dispatch.js'
import type {
  SupportReportAnalysisStatus,
  SupportReportStatus,
} from '../../domain/support-report/support-report.types.js'
import {
  sanitizeAnalysisSummary,
  sanitizeOperatorNotes,
} from '../../domain/support-report/support-report.types.js'

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
  analysisStatus: SupportReportAnalysisStatus
  operatorNotes: string | null
  analysisSummary: string | null
  analysisArtifactPath: string | null
  analysisRequestedAt: string | null
  analysisCompletedAt: string | null
  analysisLastError: string | null
}

function mapOpsRow(row: Awaited<ReturnType<SupportReportPgRepository['listForOps']>>[number]): SupportReportOpsRow {
  return {
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
    analysisStatus: row.analysisStatus,
    operatorNotes: row.operatorNotes,
    analysisSummary: row.analysisSummary,
    analysisArtifactPath: row.analysisArtifactPath,
    analysisRequestedAt: row.analysisRequestedAt?.toISOString() ?? null,
    analysisCompletedAt: row.analysisCompletedAt?.toISOString() ?? null,
    analysisLastError: row.analysisLastError,
  }
}

export type RequestAnalysisResult =
  | { ok: true; analysisStatus: SupportReportAnalysisStatus; message: string }
  | { ok: false; error: 'not_found' | 'investigator_unavailable' | 'dispatch_failed'; message: string }

export class OpsSupportReportService {
  constructor(private readonly repo: SupportReportPgRepository) {}

  async list(status: SupportReportStatus = 'open', limit = 50): Promise<SupportReportOpsRow[]> {
    const rows = await this.repo.listForOps(status, limit)
    return rows.map(mapOpsRow)
  }

  async updateStatus(id: string, status: 'triaged' | 'resolved' | 'closed'): Promise<boolean> {
    return this.repo.updateStatusForOps(id, status)
  }

  async requestAnalysis(id: string, operatorNotes?: string): Promise<RequestAnalysisResult> {
    const record = await this.repo.findByIdForOps(id)
    if (!record) {
      return { ok: false, error: 'not_found', message: 'Chamado não encontrado' }
    }

    const notes = sanitizeOperatorNotes(operatorNotes) ?? record.operatorNotes
    if (notes && notes !== record.operatorNotes) {
      await this.repo.updateOperatorNotesForOps(id, notes)
    }

    const dispatch = await dispatchSupportReportInvestigator(
      { ...record, operatorNotes: notes },
      { operatorNotes: notes, trigger: 'manual' },
    )

    const analysisStatus = analysisStatusFromInvestigatorResult(dispatch)
    const analysisError = analysisErrorFromInvestigatorResult(dispatch)
    const now = new Date()

    await this.repo.updateAnalysisStateForOps(id, {
      analysisStatus,
      analysisLastError: analysisError,
      analysisRequestedAt: dispatch.outcome === 'sent' ? now : record.analysisRequestedAt,
      operatorNotes: notes,
      analysisCompletedAt: null,
    })

    if (dispatch.outcome === 'sent') {
      return {
        ok: true,
        analysisStatus: 'in_progress',
        message: 'Investigador Cursor disparado — aguarde o rascunho em docs/ops/investigations/',
      }
    }

    if (dispatch.outcome === 'skipped') {
      return {
        ok: false,
        error: 'investigator_unavailable',
        message: analysisError ?? 'Automação Cursor não configurada neste ambiente',
      }
    }

    return {
      ok: false,
      error: 'dispatch_failed',
      message: analysisError ?? 'Falha ao disparar investigador',
    }
  }

  async completeAnalysis(
    id: string,
    input: { analysisSummary?: string; analysisArtifactPath?: string },
  ): Promise<boolean> {
    const summary = sanitizeAnalysisSummary(input.analysisSummary)
    const artifact = input.analysisArtifactPath?.trim().slice(0, 512) ?? null
    if (!summary && !artifact) return false

    return this.repo.updateAnalysisStateForOps(id, {
      analysisStatus: 'completed',
      analysisSummary: summary,
      analysisArtifactPath: artifact,
      analysisCompletedAt: new Date(),
      analysisLastError: null,
    })
  }
}
