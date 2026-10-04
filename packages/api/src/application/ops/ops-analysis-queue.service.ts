import type { OpsAlert } from '../../domain/ops/ops-metrics.types.js'
import type {
  AgentAnalysisCallbackInput,
  AgentCallbackProcessResult,
  AnalysisQueueLane,
  AnalysisQueueSourceType,
  IncidentPipelineStatus,
  OpsAnalysisAttentionCounts,
  OpsAnalysisQueueRecord,
} from '../../domain/ops/ops-analysis-queue.types.js'
import type { PlatformDefectRecord } from '../../domain/ops/platform-defect.types.js'
import { resolveDeploymentTier } from '../../domain/ops/investigator-environment.js'
import { resolveInvestigationIdFromCallback } from '../../domain/ops/investigation-correlation.js'
import type { SupportReportRecord } from '../../domain/support-report/support-report.types.js'
import {
  inferSupportReportApplication,
  SUPPORT_INCIDENT_ORIGIN_USUARIO,
} from '../../domain/support-report/support-report-incident.js'
import type { OpsAnalysisQueuePgRepository } from '../../infrastructure/persistence/ops-analysis-queue.pg.repository.js'
import type { SupportReportPgRepository } from '../../infrastructure/persistence/support-report.pg.repository.js'
import type { OpsAlertAnalysisStore } from './ops-alert-analysis.store.js'
import {
  assertGithubPrUrlForReadyForPr,
  type PlatformDefectService,
} from './platform-defect.service.js'
import { sanitizeAnalysisSummary } from '../../domain/support-report/support-report.types.js'
import { sanitizeOpsAlertAnalysisSummary } from '../../domain/ops/ops-alert-analysis.types.js'

function laneLabel(lane: AnalysisQueueLane): string {
  return lane === 'development_support' ? 'Suporte ao Desenvolvimento' : 'Suporte SRE'
}

function supportTitle(record: SupportReportRecord): string {
  return `[${record.category}] ${record.route ?? 'sem rota'}`
}

function supportErrorSummary(record: SupportReportRecord): string | null {
  const errors = record.diagnosticContext.recentClientErrors
  if (!Array.isArray(errors) || !errors.length) return null
  const first = errors[0] as Record<string, unknown> | undefined
  const fp = first?.fingerprint
  return typeof fp === 'string' ? fp.slice(0, 128) : null
}

function supportContext(record: SupportReportRecord): Record<string, unknown> {
  return {
    category: record.category,
    route: record.route,
    consentTechnical: record.consentTechnical,
    appVersion: record.appVersion,
    incidentOrigin: SUPPORT_INCIDENT_ORIGIN_USUARIO,
    application: inferSupportReportApplication(record),
  }
}

function alertPriority(alert: OpsAlert): 'low' | 'normal' | 'high' | 'critical' {
  if (alert.severity === 'critical') return 'critical'
  if (alert.severity === 'warning') return 'high'
  return 'normal'
}

const TRIAGE_STARTED_NOOP_PIPELINE: IncidentPipelineStatus[] = [
  'in_triage',
  'triaged',
  'resolved',
  'dismissed',
]

export type MarkTriageStartedResult =
  | { ok: true; incidentPipelineStatus: 'in_triage'; noop?: true }
  | { ok: false; error: 'not_found' }
  | { ok: false; error: 'invalid_state'; message: string }

export class OpsAnalysisQueueService {
  constructor(
    private readonly repo: OpsAnalysisQueuePgRepository,
    private readonly supportRepo?: SupportReportPgRepository,
    private readonly alertStore?: OpsAlertAnalysisStore,
    private readonly platformDefects?: PlatformDefectService,
  ) {}

  async enqueueSupportReportBatch(input: {
    batchSourceId: string
    deploymentTier: string
    category: string
    reportIds: string[]
    records: SupportReportRecord[]
  }): Promise<OpsAnalysisQueueRecord> {
    const title = `[batch:${input.category}] ${input.reportIds.length} chamado(s)`
    return this.repo.upsertQueued({
      sourceType: 'support_report',
      sourceId: input.batchSourceId,
      lane: 'development_support',
      deploymentTier: input.deploymentTier,
      title,
      errorSummary: null,
      contextSnapshot: {
        batch: true,
        category: input.category,
        reportIds: input.reportIds,
        routes: input.records.map((r) => r.route).filter(Boolean),
      },
      investigationTrigger: 'auto',
      priority: input.category === 'technical_bug' ? 'high' : 'normal',
    })
  }

  async enqueueSupportReport(
    record: SupportReportRecord,
    options: { operatorNotes?: string | null; trigger: 'auto' | 'manual' },
  ): Promise<OpsAnalysisQueueRecord> {
    return this.repo.upsertQueued({
      sourceType: 'support_report',
      sourceId: record.id,
      lane: 'development_support',
      deploymentTier: resolveDeploymentTier(),
      title: supportTitle(record),
      errorSummary: supportErrorSummary(record),
      contextSnapshot: supportContext(record),
      operatorNotes: options.operatorNotes ?? record.operatorNotes,
      investigationTrigger: options.trigger,
      priority: record.category === 'technical_bug' ? 'high' : 'normal',
    })
  }

  async enqueueClientErrorSignal(input: {
    fingerprint: string
    feature: string
    errorCode: string
    errorKind: string
    route?: string | null
    apiPath?: string | null
    deploymentTier: string
    lane: AnalysisQueueLane
  }): Promise<OpsAnalysisQueueRecord> {
    const title = `Client error · ${input.feature} · ${input.errorCode}`
    return this.repo.upsertQueued({
      sourceType: 'ops_alert',
      sourceId: `client_error:${input.fingerprint}`,
      lane: input.lane,
      deploymentTier: input.deploymentTier,
      title,
      errorSummary: input.errorCode.slice(0, 4000),
      contextSnapshot: {
        severity: 'warning',
        category: 'product',
        incidentOrigin: 'client_error_bridge',
        application: 'Web',
        fingerprint: input.fingerprint,
        feature: input.feature,
        errorKind: input.errorKind,
        ...(input.route ? { route: input.route.slice(0, 128) } : {}),
        ...(input.apiPath ? { api_path: input.apiPath.slice(0, 128) } : {}),
      },
      investigationTrigger: 'auto',
      priority: 'normal',
    })
  }

  async enqueueOpsAlert(
    alert: OpsAlert,
    options: { operatorNotes?: string | null; trigger: 'auto' | 'manual' },
  ): Promise<OpsAnalysisQueueRecord> {
    return this.repo.upsertQueued({
      sourceType: 'ops_alert',
      sourceId: alert.id,
      lane: 'sre_support',
      deploymentTier: resolveDeploymentTier(),
      title: `[${alert.severity}] ${alert.category}: ${alert.message}`.slice(0, 512),
      errorSummary: alert.message,
      contextSnapshot: {
        severity: alert.severity,
        category: alert.category,
        incidentOrigin: 'alerta_ops',
        application: 'Ops',
        ...(alert.details ?? {}),
      },
      operatorNotes: options.operatorNotes,
      investigationTrigger: options.trigger,
      priority: alertPriority(alert),
    })
  }

  async markInvestigating(queueId: string): Promise<void> {
    await this.repo.markInvestigating(queueId)
  }

  async markTriageStarted(queueId: string): Promise<MarkTriageStartedResult> {
    const record = await this.repo.findById(queueId)
    if (!record) return { ok: false, error: 'not_found' }

    const pipeline = record.incidentPipelineStatus
    if (TRIAGE_STARTED_NOOP_PIPELINE.includes(pipeline)) {
      return { ok: true, incidentPipelineStatus: 'in_triage', noop: true }
    }

    const fromDispatch =
      pipeline === 'forwarded' || pipeline === 'queued_worker'
    const fromOpenInvestigating =
      pipeline === 'open' && record.status === 'investigating'

    if (!fromDispatch && !fromOpenInvestigating) {
      if (pipeline === 'dispatch_failed') {
        return {
          ok: false,
          error: 'invalid_state',
          message: 'incident dispatch failed — retry dispatch before triage',
        }
      }
      if (pipeline === 'open') {
        return {
          ok: false,
          error: 'invalid_state',
          message: 'incident not forwarded to automation yet',
        }
      }
      return {
        ok: false,
        error: 'invalid_state',
        message: `cannot start triage from pipeline ${pipeline}`,
      }
    }

    await this.repo.markPipelineInTriage(queueId)
    if (record.status !== 'investigating' && record.status !== 'fix_proposed') {
      await this.repo.markInvestigating(queueId)
    }
    return { ok: true, incidentPipelineStatus: 'in_triage' }
  }

  async markFailed(queueId: string, error: string): Promise<void> {
    await this.repo.markFailed(queueId, error)
  }

  async markDismissed(queueId: string, reason: string): Promise<void> {
    await this.repo.markDismissed(queueId, reason)
  }

  async markDeferred(queueId: string, reason: string): Promise<void> {
    await this.repo.markDeferred(queueId, reason)
  }

  async processAgentCallback(input: AgentAnalysisCallbackInput): Promise<AgentCallbackProcessResult> {
    const summary = sanitizeAnalysisSummary(input.remediationSummary)
      ?? sanitizeOpsAlertAnalysisSummary(input.remediationSummary)
    if (!summary) return { queue: null, defect: null }

    let defectRecord: PlatformDefectRecord | null = null
    if (input.defectId && input.defectStatus && this.platformDefects) {
      defectRecord = await this.platformDefects.applyAgentStatusCallback({
        ...input,
        remediationSummary: summary,
      })
    } else if (input.defectId && input.defectStatus === 'ready_for_pr') {
      assertGithubPrUrlForReadyForPr(input.prUrl)
    }

    let record: OpsAnalysisQueueRecord | null = null
    const investigationId = resolveInvestigationIdFromCallback(input)
    if (investigationId) {
      record = await this.repo.applyAgentCallback(investigationId, {
        remediationSummary: summary,
        analysisArtifactPath: input.analysisArtifactPath,
        prUrl: input.prUrl,
        errorSummary: input.errorSummary,
      })
    } else if (input.sourceType && input.sourceId) {
      const existing = await this.repo.findBySource(
        input.sourceType,
        input.sourceId,
        resolveDeploymentTier(),
      )
      if (!existing) return { queue: null, defect: defectRecord }
      record = await this.repo.applyAgentCallback(existing.id, {
        remediationSummary: summary,
        analysisArtifactPath: input.analysisArtifactPath,
        prUrl: input.prUrl,
        errorSummary: input.errorSummary,
      })
    }
    if (!record) {
      return { queue: null, defect: defectRecord }
    }

    await this.syncLegacyAnalysis(record, summary, input)
    await this.applySupportReportPatches(record, input)
    await this.applyTriagePipelineOutcome(record, summary, input)
    const refreshed = await this.repo.findById(record.id)
    return { queue: refreshed ?? record, defect: defectRecord }
  }

  async completeFromAgent(input: AgentAnalysisCallbackInput): Promise<OpsAnalysisQueueRecord | null> {
    const result = await this.processAgentCallback(input)
    return result.queue
  }

  private async applyTriagePipelineOutcome(
    record: OpsAnalysisQueueRecord,
    summary: string,
    input: AgentAnalysisCallbackInput,
  ): Promise<void> {
    const decision = input.triageDecision

    if (!decision) return

    if (decision === 'dismiss') {
      await this.repo.markDismissed(record.id, summary)
      return
    }

    if (this.platformDefects) {
      if (decision === 'new_defect' && input.parentDefectId?.trim()) {
        await this.repo.linkRecurrenceFromPriorDefect(record.id, input.parentDefectId.trim())
      }

      if (decision === 'new_defect' && input.defect?.title) {
        await this.platformDefects.createFromTriage(
          {
            title: input.defect.title,
            fingerprint: input.defect.fingerprint ?? null,
            impact: input.defect.impact ?? null,
            applications: input.defect.applications ?? [],
            triageSummary: summary,
            triageArtifactPath: input.analysisArtifactPath ?? null,
          },
          record.id,
          'agent_triage',
          {
            incidentSeenAt: record.createdAt,
            parentDefectId: input.parentDefectId ?? null,
            recurrenceLikely: input.recurrenceLikely,
          },
        )
      } else if (decision === 'link_defect' && input.linkDefectId) {
        await this.platformDefects.linkIncident(input.linkDefectId, record.id, 'agent_triage')
      }
    }

    if (
      decision === 'new_defect' ||
      decision === 'link_defect' ||
      decision === 'resolve_incident_only' ||
      decision === 'infra_failure'
    ) {
      await this.repo.setIncidentPipelineStatus(record.id, 'triaged')
    }
  }

  private isBatchSupportRecord(record: OpsAnalysisQueueRecord): boolean {
    return Boolean(record.contextSnapshot?.batch) || record.sourceId.startsWith('batch:')
  }

  private batchReportIds(record: OpsAnalysisQueueRecord): string[] {
    const ids = record.contextSnapshot?.reportIds
    if (!Array.isArray(ids)) return []
    return ids.filter((id): id is string => typeof id === 'string')
  }

  private async applySupportReportPatches(
    record: OpsAnalysisQueueRecord,
    input: AgentAnalysisCallbackInput,
  ): Promise<void> {
    if (!this.supportRepo || record.sourceType !== 'support_report') return
    const patches = input.reportPatches ?? []

    for (const patch of patches) {
      await this.supportRepo.applyAgentOpsPatch(patch.reportId, {
        suggestedCategory: patch.suggestedCategory ?? null,
        categoryReviewNote: patch.categoryReviewNote ?? null,
        taxonomyGapProposal: patch.taxonomyGapProposal ?? null,
        deploymentStatus: patch.deploymentStatus as SupportReportRecord['deploymentStatus'] | undefined,
        deploymentActions: patch.deploymentActions,
        analysisSummary: patch.analysisSummary ?? null,
        analysisArtifactPath: patch.analysisArtifactPath ?? null,
        analysisStatus: 'in_progress',
      }).catch(() => undefined)
    }

    if (patches.length > 0) return

    const sharedPatch = {
      deploymentStatus: input.deploymentStatus as SupportReportRecord['deploymentStatus'] | undefined,
      deploymentActions: input.deploymentActions,
      analysisSummary: input.remediationSummary,
      analysisArtifactPath: input.analysisArtifactPath ?? null,
      analysisStatus: 'in_progress' as const,
    }

    if (this.isBatchSupportRecord(record)) {
      for (const reportId of this.batchReportIds(record)) {
        await this.supportRepo.applyAgentOpsPatch(reportId, sharedPatch).catch(() => undefined)
      }
      return
    }

    await this.supportRepo.applyAgentOpsPatch(record.sourceId, {
      ...sharedPatch,
      deploymentStatus: sharedPatch.deploymentStatus ?? 'fix_proposed',
    }).catch(() => undefined)
  }

  private async syncLegacyAnalysis(
    record: OpsAnalysisQueueRecord,
    summary: string,
    input: AgentAnalysisCallbackInput,
  ): Promise<void> {
    const artifact = input.analysisArtifactPath?.trim().slice(0, 512) ?? null
    if (record.sourceType === 'support_report' && this.supportRepo) {
      if (this.isBatchSupportRecord(record)) {
        for (const reportId of this.batchReportIds(record)) {
          await this.supportRepo.updateAnalysisStateForOps(reportId, {
            analysisStatus: 'in_progress',
            analysisSummary: summary,
            analysisArtifactPath: artifact,
            analysisLastError: null,
          }).catch(() => undefined)
        }
      } else {
        await this.supportRepo.updateAnalysisStateForOps(record.sourceId, {
          analysisStatus: 'in_progress',
          analysisSummary: summary,
          analysisArtifactPath: artifact,
          analysisLastError: null,
        }).catch(() => undefined)
      }
    }
    if (record.sourceType === 'ops_alert' && this.alertStore) {
      const existing = await this.alertStore.get(record.sourceId)
      await this.alertStore.save({
        ...existing,
        alertId: record.sourceId,
        analysisStatus: 'in_progress',
        analysisSummary: summary,
        analysisArtifactPath: artifact,
        analysisLastError: null,
      }).catch(() => undefined)
    }
  }

  async markHumanCompleted(queueId: string): Promise<boolean> {
    const record = await this.repo.findById(queueId)
    if (!record) return false
    const ok = await this.repo.markCompleted(queueId)
    if (!ok) return false

    if (record.sourceType === 'support_report' && this.supportRepo) {
      const reportIds = this.isBatchSupportRecord(record)
        ? this.batchReportIds(record)
        : [record.sourceId]
      for (const reportId of reportIds) {
        await this.supportRepo.updateAnalysisStateForOps(reportId, {
          analysisStatus: 'completed',
          analysisCompletedAt: new Date(),
        }).catch(() => undefined)
      }
    }
    if (record.sourceType === 'ops_alert' && this.alertStore) {
      const existing = await this.alertStore.get(record.sourceId)
      await this.alertStore.save({
        ...existing,
        alertId: record.sourceId,
        analysisStatus: 'completed',
        analysisCompletedAt: new Date().toISOString(),
      }).catch(() => undefined)
    }
    return true
  }

  listOpen(limit = 100): Promise<OpsAnalysisQueueRecord[]> {
    return this.repo.listOpen(limit)
  }

  async listForIncidentBoard(
    filter: import('../../domain/ops/incident-list-filter.js').IncidentBoardFilter,
    options?: { limit?: number; ensureId?: string },
  ): Promise<OpsAnalysisQueueRecord[]> {
    const limit = options?.limit ?? 100
    const records = await this.repo.listForIncidentBoard(filter, limit)
    const ensureId = options?.ensureId?.trim()
    if (!ensureId) return records
    if (records.some((r) => r.id === ensureId)) return records
    const extra = await this.repo.findById(ensureId)
    if (!extra) return records
    return [extra, ...records].slice(0, limit)
  }

  findByReferenceCode(referenceCode: string): Promise<OpsAnalysisQueueRecord | null> {
    return this.repo.findByReferenceCode(referenceCode)
  }

  searchForIncidentBoard(query: string, limit = 50): Promise<OpsAnalysisQueueRecord[]> {
    return this.repo.searchForIncidentBoard(query, limit)
  }

  attentionCounts(deploymentTier?: string): Promise<OpsAnalysisAttentionCounts> {
    return this.repo.attentionCounts(deploymentTier)
  }

  findInvestigationIdForSource(
    sourceType: AnalysisQueueSourceType,
    sourceId: string,
  ): Promise<string | null> {
    return this.repo.findBySource(sourceType, sourceId, resolveDeploymentTier()).then((r) => r?.id ?? null)
  }

  findInvestigationIdsForSources(
    sourceType: AnalysisQueueSourceType,
    sourceIds: string[],
  ): Promise<Map<string, string>> {
    return this.repo.findInvestigationIdsBySourceIds(sourceType, sourceIds, resolveDeploymentTier())
  }

  findById(id: string): Promise<OpsAnalysisQueueRecord | null> {
    return this.repo.findById(id)
  }

  static laneDisplayName(lane: AnalysisQueueLane): string {
    return laneLabel(lane)
  }
}
