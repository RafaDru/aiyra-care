import { randomUUID } from 'node:crypto'
import type { SupportReportRecord } from '../../domain/support-report/support-report.types.js'
import { resolveDeploymentTier } from '../../domain/ops/investigator-environment.js'
import {
  resolveSupportInvestigationTier,
} from '../../domain/ops/investigator-tier.js'
import type { OpsAnalysisQueueService } from '../ops/ops-analysis-queue.service.js'
import type { SupportReportPgRepository } from '../../infrastructure/persistence/support-report.pg.repository.js'
import { resolveInvestigatorCallbackUrl } from '../ops/ops-analysis-callback-url.js'
import {
  dispatchSupportReportBatchInvestigator,
  type SupportReportBatchDispatchResult,
} from './support-report-dispatch.js'

export interface SupportReportBatchGroupKey {
  deploymentTier: string
  category: string
}

export function groupSupportReportsForBatch(
  records: SupportReportRecord[],
  deploymentTier: string,
): Map<string, SupportReportRecord[]> {
  const groups = new Map<string, SupportReportRecord[]>()
  for (const record of records) {
    const key = `${deploymentTier}\0${record.category}`
    const list = groups.get(key) ?? []
    list.push(record)
    groups.set(key, list)
  }
  return groups
}

function diagnosticExcerpt(record: SupportReportRecord): string | null {
  if (!record.consentTechnical) return null
  const errors = record.diagnosticContext.recentClientErrors
  if (!Array.isArray(errors) || !errors.length) return null
  const first = errors[0] as Record<string, unknown> | undefined
  const fp = first?.fingerprint
  return typeof fp === 'string' ? fp.slice(0, 64) : null
}

export async function runSupportReportBatchDispatch(options: {
  supportRepo: SupportReportPgRepository
  queueService: OpsAnalysisQueueService
  limit?: number
}): Promise<{
  checkedAt: string
  groupsDispatched: number
  reportsDispatched: number
  skipped: boolean
  reason?: string
  errors: string[]
}> {
  const deploymentTier = resolveDeploymentTier()
  const queued = await options.supportRepo.listQueuedForBatch(deploymentTier, options.limit ?? 200)
  if (!queued.length) {
    return {
      checkedAt: new Date().toISOString(),
      groupsDispatched: 0,
      reportsDispatched: 0,
      skipped: true,
      reason: 'no_queued_reports',
      errors: [],
    }
  }

  const groups = groupSupportReportsForBatch(queued, deploymentTier)
  const callbackUrl = resolveInvestigatorCallbackUrl()
  let groupsDispatched = 0
  let reportsDispatched = 0
  const errors: string[] = []

  for (const [, records] of groups) {
    if (!records.length) continue
    const category = records[0].category
    const batchSourceId = `batch:${randomUUID()}`
    const queueItem = await options.queueService.enqueueSupportReportBatch({
      batchSourceId,
      deploymentTier,
      category,
      reportIds: records.map((r) => r.id),
      records,
    })

    const tier = resolveSupportInvestigationTier(records[0], 'auto')
    const dispatch: SupportReportBatchDispatchResult = await dispatchSupportReportBatchInvestigator({
      category,
      deploymentTier,
      records: records.map((r) => ({
        reportId: r.id,
        route: r.route,
        descriptionExcerpt: r.description?.slice(0, 160) ?? null,
        diagnosticSummary: diagnosticExcerpt(r),
      })),
      investigationTier: tier,
      analysisQueue: { id: queueItem.id, callbackUrl },
    })

    if (dispatch.outcome === 'sent') {
      groupsDispatched += 1
      reportsDispatched += records.length
      await options.queueService.markInvestigating(queueItem.id)
      const now = new Date()
      for (const record of records) {
        await options.supportRepo.updateAnalysisStateForOps(record.id, {
          analysisStatus: 'in_progress',
          analysisRequestedAt: now,
          analysisLastError: null,
        }).catch(() => undefined)
      }
    } else if (dispatch.outcome === 'failed') {
      errors.push(dispatch.error ?? 'batch_dispatch_failed')
      await options.queueService.markFailed(queueItem.id, dispatch.error ?? 'batch_dispatch_failed')
    }
  }

  return {
    checkedAt: new Date().toISOString(),
    groupsDispatched,
    reportsDispatched,
    skipped: false,
    errors,
  }
}
