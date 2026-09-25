import type { ProductEventService } from '../telemetry/product-event.service.js'
import type { SupportReportRepository } from '../../domain/support-report/support-report.repository.js'
import {
  PROFILE_ACCESS_DAYS,
  REPORT_RETENTION_DAYS,
  SUPPORT_REPORT_CATEGORY_SET,
  MAX_SCREENSHOT_BASE64_LENGTH,
  sanitizeSupportClientContext,
  sanitizeSupportDescription,
  type CreateSupportReportInput,
  type SupportReportRecord,
} from '../../domain/support-report/support-report.types.js'
import type { OpsAnalysisQueueService } from '../ops/ops-analysis-queue.service.js'
import type { IncidentDispatchService } from '../ops/incident-dispatch.service.js'

function addDays(date: Date, days: number): Date {
  const out = new Date(date)
  out.setUTCDate(out.getUTCDate() + days)
  return out
}

export class SupportReportService {
  constructor(
    private readonly repo: SupportReportRepository,
    private readonly productEvents?: ProductEventService,
    private readonly queueService?: OpsAnalysisQueueService,
    private readonly incidentDispatch?: IncidentDispatchService,
  ) {}

  async create(accountId: string, input: CreateSupportReportInput): Promise<SupportReportRecord> {
    if (!SUPPORT_REPORT_CATEGORY_SET.has(input.category)) {
      throw new Error('INVALID_CATEGORY')
    }

    const now = new Date()
    const diagnosticContext = await this.buildDiagnosticContext(accountId, input)
    const screenshotData = input.consentScreenshot && input.screenshotData
      ? input.screenshotData.slice(0, MAX_SCREENSHOT_BASE64_LENGTH)
      : undefined

    if (input.consentScreenshot && input.screenshotData && !screenshotData?.length) {
      throw new Error('INVALID_SCREENSHOT')
    }

    const record = await this.repo.insert({
      accountId,
      category: input.category,
      description: sanitizeSupportDescription(input.description) ?? undefined,
      route: input.route,
      sessionId: input.sessionId,
      patientId: input.patientId,
      consentTechnical: input.consentTechnical,
      consentScreenshot: input.consentScreenshot,
      consentProfileAccess: input.consentProfileAccess,
      appVersion: input.appVersion,
      userAgent: input.userAgent,
      diagnosticContext,
      profileAccessUntil: input.consentProfileAccess ? addDays(now, PROFILE_ACCESS_DAYS) : null,
      expiresAt: addDays(now, REPORT_RETENTION_DAYS),
      screenshotData: screenshotData?.length ? screenshotData : undefined,
    })

    if (this.productEvents) {
      const { trackServerProductEvent } = await import('../telemetry/server-product-event.js')
      await trackServerProductEvent(this.productEvents, accountId, {
        eventName: 'support_report_submitted',
        route: input.route?.slice(0, 128),
        patientId: input.patientId,
        properties: {
          kind: input.category,
          source: input.consentTechnical ? 'technical' : 'minimal',
        },
      })
    }

    void this.enqueueSupportIncidentAndDispatch(record).catch(() => undefined)

    return record
  }

  /** Sempre enfileira incidente (ops_analysis_queue, origem Usuário) + webhook investigador. */
  private async enqueueSupportIncidentAndDispatch(record: SupportReportRecord): Promise<void> {
    const {
      dispatchSupportReport,
      analysisStatusFromInvestigatorResult,
      analysisErrorFromInvestigatorResult,
    } = await import('./support-report-dispatch.js')
    const { isSupportInvestigatorBatchMode } = await import(
      '../../domain/ops/support-investigator-mode.js'
    )
    const { investigateSupportReportWithQueue } = await import(
      '../ops/ops-analysis-investigation.helper.js'
    )

    if (!this.queueService) {
      await this.repo.updateAnalysisStateForOps(record.id, {
        analysisStatus: 'pending',
        analysisLastError: 'incident_queue_unavailable',
      }).catch(() => undefined)
      return
    }

    let investigator: Awaited<ReturnType<typeof investigateSupportReportWithQueue>>['dispatch'] = {
      outcome: 'failed',
      error: 'dispatch_failed',
    }
    let investigationId: string | undefined

    try {
      if (isSupportInvestigatorBatchMode()) {
        const item = await this.queueService.enqueueSupportReport(record, { trigger: 'auto' })
        investigationId = item.id
        await dispatchSupportReport(record, { investigationId })
        await this.repo.updateAnalysisStateForOps(record.id, {
          analysisStatus: 'queued',
          analysisLastError: null,
          analysisRequestedAt: null,
        }).catch(() => undefined)
        return
      }

      const result = await investigateSupportReportWithQueue(
        this.queueService,
        record,
        { trigger: 'auto' },
        this.incidentDispatch,
      )
      investigationId = result.investigationId
      investigator = result.dispatch
      await dispatchSupportReport(record, { investigationId })
    } catch {
      investigator = { outcome: 'failed', error: 'dispatch_failed' }
    }

    const analysisStatus = analysisStatusFromInvestigatorResult(investigator)
    const analysisError = analysisErrorFromInvestigatorResult(investigator)
    await this.repo.updateAnalysisStateForOps(record.id, {
      analysisStatus,
      analysisLastError: analysisError,
      analysisRequestedAt: investigator.outcome === 'sent' ? new Date() : null,
    }).catch(() => undefined)
  }

  async listForAccount(accountId: string): Promise<SupportReportRecord[]> {
    return this.repo.listByAccount(accountId, 20)
  }

  async getForAccount(accountId: string, id: string): Promise<SupportReportRecord | null> {
    return this.repo.findByIdForAccount(id, accountId)
  }

  private async buildDiagnosticContext(
    accountId: string,
    input: CreateSupportReportInput,
  ): Promise<Record<string, unknown>> {
    const base: Record<string, unknown> = {
      client: sanitizeSupportClientContext(input.clientContext),
      submittedAt: new Date().toISOString(),
    }

    if (!input.consentTechnical) return base

    const [events, errors] = await Promise.all([
      this.repo.fetchRecentProductEvents(accountId, input.sessionId, 15),
      this.repo.fetchRecentClientErrors(accountId, 10),
    ])

    base.recentProductEvents = events
    base.recentClientErrors = errors

    if (input.patientId) {
      const syncFailure = await this.repo.fetchLastSyncFailure(input.patientId)
      if (syncFailure) base.lastSyncFailure = syncFailure
    }

    return base
  }
}
