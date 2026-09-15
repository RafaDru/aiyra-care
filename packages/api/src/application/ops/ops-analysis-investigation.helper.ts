import type { OpsAlert } from '../../domain/ops/ops-metrics.types.js'
import type { OpsAlertTriageRow } from '../../domain/ops/ops-alert-triage.js'
import type { SupportReportRecord } from '../../domain/support-report/support-report.types.js'
import {
  isPreScreenEnabled,
  preScreenOpsAlert,
  preScreenSupportReport,
} from '../../domain/ops/ops-analysis-pre-screen.js'
import { resolveInvestigatorCallbackUrl } from './ops-analysis-callback-url.js'
import type { OpsAnalysisQueueService } from './ops-analysis-queue.service.js'
import {
  dispatchOpsAlertInvestigator,
  type OpsAlertInvestigatorDispatchResult,
} from './ops-alert-investigator-dispatch.js'
import {
  dispatchSupportReportInvestigator,
  type SupportInvestigatorDispatchResult,
} from '../support-report/support-report-dispatch.js'

export async function investigateSupportReportWithQueue(
  queueService: OpsAnalysisQueueService,
  record: SupportReportRecord,
  options: { operatorNotes?: string | null; trigger: 'auto' | 'manual' },
): Promise<{ queueId: string; dispatch: SupportInvestigatorDispatchResult }> {
  const item = await queueService.enqueueSupportReport(record, options)

  if (isPreScreenEnabled()) {
    const pre = preScreenSupportReport(record, options.trigger)
    if (pre.outcome === 'dismiss') {
      await queueService.markDismissed(item.id, `pre_screen: ${pre.reason}`)
      return { queueId: item.id, dispatch: { outcome: 'skipped', reason: 'pre_screen' } }
    }
    if (pre.outcome === 'defer') {
      await queueService.markDeferred(item.id, pre.reason)
      return { queueId: item.id, dispatch: { outcome: 'skipped', reason: 'pre_screen' } }
    }
  }

  const callbackUrl = resolveInvestigatorCallbackUrl()
  const dispatch = await dispatchSupportReportInvestigator(record, {
    operatorNotes: options.operatorNotes,
    trigger: options.trigger,
    analysisQueue: { id: item.id, callbackUrl },
  })
  if (dispatch.outcome === 'sent') {
    await queueService.markInvestigating(item.id)
  } else if (dispatch.outcome === 'failed') {
    await queueService.markFailed(item.id, dispatch.error)
  }
  return { queueId: item.id, dispatch }
}

export async function investigateOpsAlertWithQueue(
  queueService: OpsAnalysisQueueService,
  alert: OpsAlert,
  options: {
    checkedAt: string
    triage?: OpsAlertTriageRow
    operatorNotes?: string | null
    trigger: 'auto' | 'manual'
  },
): Promise<{ queueId: string; dispatch: OpsAlertInvestigatorDispatchResult }> {
  const item = await queueService.enqueueOpsAlert(alert, {
    operatorNotes: options.operatorNotes,
    trigger: options.trigger,
  })

  if (isPreScreenEnabled()) {
    const pre = preScreenOpsAlert(alert, options.trigger)
    if (pre.outcome === 'dismiss') {
      await queueService.markDismissed(item.id, `pre_screen: ${pre.reason}`)
      return { queueId: item.id, dispatch: { outcome: 'skipped', reason: 'pre_screen' } }
    }
    if (pre.outcome === 'defer') {
      await queueService.markDeferred(item.id, pre.reason)
      return { queueId: item.id, dispatch: { outcome: 'skipped', reason: 'pre_screen' } }
    }
  }

  const callbackUrl = resolveInvestigatorCallbackUrl()
  const dispatch = await dispatchOpsAlertInvestigator(alert, {
    ...options,
    analysisQueue: { id: item.id, callbackUrl },
  })
  if (dispatch.outcome === 'sent') {
    await queueService.markInvestigating(item.id)
  } else if (dispatch.outcome === 'failed') {
    await queueService.markFailed(item.id, dispatch.error)
  }
  return { queueId: item.id, dispatch }
}
