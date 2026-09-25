import type { SupportReportPgRepository } from '../../infrastructure/persistence/support-report.pg.repository.js'
import {
  analysisErrorFromInvestigatorResult,
  analysisStatusFromInvestigatorResult,
  dispatchSupportReportInvestigator,
} from '../support-report/support-report-dispatch.js'
import { investigateSupportReportWithQueue } from './ops-analysis-investigation.helper.js'
import type { OpsAnalysisQueueService } from './ops-analysis-queue.service.js'
import type { IncidentDispatchService } from './incident-dispatch.service.js'
import type {
  SupportReportAnalysisStatus,
  SupportReportRecord,
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
  investigationId: string | null
  suggestedCategory: string | null
  categoryReviewNote: string | null
  taxonomyGapProposal: string | null
  deploymentStatus: string
  deploymentActions: Array<{ label: string; kind: string; url?: string; done?: boolean }>
}

function mapOpsRow(
  row: Awaited<ReturnType<SupportReportPgRepository['listForOps']>>[number],
  investigationId?: string | null,
): SupportReportOpsRow {
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
    investigationId: investigationId ?? null,
    suggestedCategory: row.suggestedCategory,
    categoryReviewNote: row.categoryReviewNote,
    taxonomyGapProposal: row.taxonomyGapProposal,
    deploymentStatus: row.deploymentStatus,
    deploymentActions: row.deploymentActions,
  }
}

export type RequestAnalysisResult =
  | { ok: true; analysisStatus: SupportReportAnalysisStatus; message: string; investigationId?: string }
  | { ok: false; error: 'not_found' | 'investigator_unavailable' | 'dispatch_failed'; message: string }

export class OpsSupportReportService {
  constructor(
    private readonly repo: SupportReportPgRepository,
    private readonly queueService?: OpsAnalysisQueueService,
    private readonly incidentDispatch?: IncidentDispatchService,
  ) {}

  async list(status: SupportReportStatus = 'open', limit = 50): Promise<SupportReportOpsRow[]> {
    const rows = await this.repo.listForOps(status, limit)
    if (!this.queueService || !rows.length) {
      return rows.map((row) => mapOpsRow(row))
    }
    let invMap = new Map<string, string>()
    try {
      invMap = await this.queueService.findInvestigationIdsForSources(
        'support_report',
        rows.map((r) => r.id),
      )
    } catch (err) {
      const code = typeof err === 'object' && err !== null ? (err as { code?: string }).code : undefined
      if (code !== '42P01') throw err
    }
    return rows.map((row) => mapOpsRow(row, invMap.get(row.id)))
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

    const fullRecord = { ...record, operatorNotes: notes }
    let investigationId: string | undefined
    let dispatch: Awaited<ReturnType<typeof dispatchSupportReportInvestigator>>
    if (this.queueService) {
      const result = await investigateSupportReportWithQueue(
        this.queueService,
        fullRecord,
        { operatorNotes: notes, trigger: 'manual' },
        this.incidentDispatch,
      )
      investigationId = result.investigationId
      dispatch = result.dispatch
    } else {
      dispatch = await dispatchSupportReportInvestigator(fullRecord, {
        operatorNotes: notes,
        trigger: 'manual',
      })
    }

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
        message: investigationId
          ? `Investigador disparado — investigationId ${investigationId.slice(0, 8)}…`
          : 'Investigador Cursor disparado — aguarde o rascunho em docs/ops/investigations/',
        investigationId,
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
    input: {
      analysisSummary?: string
      analysisArtifactPath?: string
      deploymentStatus?: string
      deploymentActions?: Array<{ label: string; kind: string; url?: string; done?: boolean }>
    },
  ): Promise<boolean> {
    const summary = sanitizeAnalysisSummary(input.analysisSummary)
    const artifact = input.analysisArtifactPath?.trim().slice(0, 512) ?? null
    const hasDeployment = Boolean(input.deploymentStatus || input.deploymentActions?.length)
    if (!summary && !artifact && !hasDeployment) return false

    const ok = await this.repo.applyAgentOpsPatch(id, {
      analysisStatus: 'completed',
      analysisSummary: summary,
      analysisArtifactPath: artifact,
      analysisCompletedAt: new Date(),
      deploymentStatus: input.deploymentStatus as SupportReportRecord['deploymentStatus'] | undefined,
      deploymentActions: input.deploymentActions,
    })
    if (ok && this.queueService) {
      const invId = await this.queueService.findInvestigationIdForSource('support_report', id)
      if (invId) {
        await this.queueService.markHumanCompleted(invId).catch(() => undefined)
      }
    }
    return ok
  }
}
