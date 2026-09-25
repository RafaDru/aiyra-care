import type { OpsAlert, OpsAlertSeverity } from '../../domain/ops/ops-metrics.types.js'
import type { OpsAnalysisQueueRecord } from '../../domain/ops/ops-analysis-queue.types.js'
import type { SupportReportRecord } from '../../domain/support-report/support-report.types.js'
import { resolveInvestigatorCallbackUrl } from './ops-analysis-callback-url.js'
import {
  resolveOpsAlertInvestigationTier,
  resolveSupportInvestigationTier,
} from '../../domain/ops/investigator-tier.js'

const OPS_ALERT_CATEGORIES = new Set<OpsAlert['category']>(['sync', 'llm', 'product', 'infra'])

/** Pipeline states elegíveis para re-dispatch após outbox `dead` / `failed`. */
export const INCIDENT_PIPELINE_RECOVERABLE_STATUSES = ['open', 'forwarded', 'queued_worker'] as const

export function isQueueRecordEligibleForDispatchReconcile(
  record: OpsAnalysisQueueRecord,
  options?: { recoverStuckDispatch?: boolean },
): boolean {
  if (record.status === 'completed' || record.status === 'dismissed') return false
  const pipeline = record.incidentPipelineStatus
  if (options?.recoverStuckDispatch) {
    return (INCIDENT_PIPELINE_RECOVERABLE_STATUSES as readonly string[]).includes(pipeline)
  }
  return pipeline === 'open'
}

export function shouldNormalizePipelineAfterDeadOutboxReset(
  pipeline: OpsAnalysisQueueRecord['incidentPipelineStatus'],
): boolean {
  return pipeline === 'forwarded' || pipeline === 'queued_worker'
}

export function opsAlertFromQueueRecord(record: OpsAnalysisQueueRecord): OpsAlert | null {
  if (record.sourceType !== 'ops_alert') return null
  const ctx = record.contextSnapshot
  const severity: OpsAlertSeverity = ctx.severity === 'critical' ? 'critical' : 'warning'
  const rawCategory = String(ctx.category ?? 'infra')
  const category = OPS_ALERT_CATEGORIES.has(rawCategory as OpsAlert['category'])
    ? (rawCategory as OpsAlert['category'])
    : 'infra'
  return {
    id: record.sourceId,
    severity,
    category,
    message: record.errorSummary ?? record.title,
    detectedAt: record.queuedAt,
    details: ctx,
  }
}

export function buildOpsAlertDispatchPayload(
  record: OpsAnalysisQueueRecord,
  alert: OpsAlert,
): Record<string, unknown> {
  const trigger = record.investigationTrigger === 'manual' ? 'manual' : 'auto'
  return {
    kind: 'ops_alert_triage_v1',
    alert,
    checkedAt: record.queuedAt,
    triage: null,
    trigger,
    operatorNotes: record.operatorNotes ?? null,
    callbackUrl: resolveInvestigatorCallbackUrl(),
    investigationTier: resolveOpsAlertInvestigationTier(alert, trigger),
  }
}

export function buildSupportReportDispatchPayload(
  record: SupportReportRecord,
  options: { operatorNotes?: string | null; trigger: 'auto' | 'manual' },
): Record<string, unknown> {
  return {
    kind: 'support_report_triage_v1',
    sourceId: record.id,
    trigger: options.trigger,
    operatorNotes: options.operatorNotes ?? null,
    callbackUrl: resolveInvestigatorCallbackUrl(),
    investigationTier: resolveSupportInvestigationTier(record, options.trigger),
  }
}

export function supportDispatchOptionsFromQueue(
  record: OpsAnalysisQueueRecord,
): { operatorNotes?: string | null; trigger: 'auto' | 'manual' } {
  return {
    operatorNotes: record.operatorNotes,
    trigger: record.investigationTrigger === 'manual' ? 'manual' : 'auto',
  }
}

export function isSupportBatchQueueRecord(record: OpsAnalysisQueueRecord): boolean {
  return record.sourceType === 'support_report' && record.contextSnapshot.batch === true
}
