import type { OpsAnalysisQueueRecord } from '../../domain/ops/ops-analysis-queue.types.js'
import {
  resolveDevelopmentSupportAutomationWebhookKey,
  resolveDevelopmentSupportAutomationWebhookUrl,
} from '../../domain/ops/cursor-automation-env.js'
import {
  tier1PlaybookId,
  type InvestigationTier,
} from '../../domain/ops/investigator-tier.js'
import {
  buildOpsConsoleUrl,
  formatInvestigationIdShort,
} from '../../domain/ops/investigation-correlation.js'
import { resolveInvestigatorEnvironmentContext } from '../../domain/ops/investigator-environment.js'
import type { SupportInvestigatorDispatchResult } from '../support-report/support-report-dispatch.js'
import { resolveSupportReportOpsConsoleBaseUrl } from '../support-report/support-report-dispatch.js'

export function isClientErrorBridgeQueueRecord(record: OpsAnalysisQueueRecord): boolean {
  return (
    record.sourceType === 'ops_alert'
    && record.contextSnapshot.incidentOrigin === 'client_error_bridge'
  )
}

function fingerprintFromRecord(record: OpsAnalysisQueueRecord): string {
  const fromCtx = record.contextSnapshot.fingerprint
  if (typeof fromCtx === 'string' && fromCtx.length) return fromCtx
  if (record.sourceId.startsWith('client_error:')) {
    return record.sourceId.slice('client_error:'.length)
  }
  return record.sourceId
}

/** Payload `support_report` sintético — Triador Dev (sem linha em support_reports). */
export function buildClientErrorBridgeInvestigatorPayload(
  record: OpsAnalysisQueueRecord,
  options: {
    trigger: 'auto' | 'manual'
    operatorNotes?: string | null
    investigationId: string
    callbackUrl: string
    triageStartedUrl: string
    investigationTier?: InvestigationTier
  },
): Record<string, unknown> {
  const fingerprint = fingerprintFromRecord(record)
  const feature = String(record.contextSnapshot.feature ?? 'ui')
  const route =
    typeof record.contextSnapshot.route === 'string' ? record.contextSnapshot.route : null
  const consoleBase = resolveSupportReportOpsConsoleBaseUrl()
  const dashboardUrl = buildOpsConsoleUrl(consoleBase, {
    tab: 'incidentes',
    investigationId: options.investigationId,
  })
  const tier = options.investigationTier ?? 0
  const trigger = options.trigger
  const invSuffix = ` [inv:${formatInvestigationIdShort(options.investigationId)}]`
  const reportId = `client_error:${fingerprint}`

  return {
    type: 'support_report',
    investigationId: options.investigationId,
    reportId,
    category: 'technical_bug',
    route,
    consentTechnical: true,
    consentProfileAccess: false,
    topFingerprint: fingerprint,
    dashboardUrl,
    environment: resolveInvestigatorEnvironmentContext(),
    submittedAt: record.queuedAt,
    text: `Client error bridge: ${feature} · ${record.errorSummary ?? 'erro'}${invSuffix}`,
    toast: {
      title: '[Client error] Triagem automática',
      body: `${feature}\n${route ?? 'sem rota'}\nErro: ${fingerprint}\nConsole → Incidentes`,
      icon: 'warning',
    },
    investigation: {
      tier,
      playbook: tier === 1 ? tier1PlaybookId('development_support') : 'client-error-bridge-tier0',
      trigger,
    },
    analysisQueue: {
      id: options.investigationId,
      callbackUrl: options.callbackUrl,
      triageStartedUrl: options.triageStartedUrl,
      lane: 'development_support',
    },
    operatorNotes: options.operatorNotes ?? record.operatorNotes ?? null,
    bridge: {
      feature,
      errorKind: record.contextSnapshot.errorKind,
      errorCode: record.errorSummary,
      apiPath: record.contextSnapshot.api_path,
      incidentOrigin: 'client_error_bridge',
    },
  }
}

export async function dispatchClientErrorBridgeInvestigator(
  record: OpsAnalysisQueueRecord,
  options: {
    trigger: 'auto' | 'manual'
    operatorNotes?: string | null
    analysisQueue: { id: string; callbackUrl: string; triageStartedUrl: string }
    investigationTier?: InvestigationTier
  },
): Promise<SupportInvestigatorDispatchResult> {
  const webhook = resolveDevelopmentSupportAutomationWebhookUrl()
  if (!webhook) {
    return { outcome: 'skipped', reason: 'webhook_not_configured' }
  }
  const bearerKey = resolveDevelopmentSupportAutomationWebhookKey()
  if (!bearerKey) {
    return { outcome: 'skipped', reason: 'webhook_key_missing' }
  }

  const payload = buildClientErrorBridgeInvestigatorPayload(record, {
    trigger: options.trigger,
    operatorNotes: options.operatorNotes,
    investigationId: options.analysisQueue.id,
    investigationTier: options.investigationTier,
    callbackUrl: options.analysisQueue.callbackUrl,
    triageStartedUrl: options.analysisQueue.triageStartedUrl,
  })

  try {
    const res = await fetch(webhook, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${bearerKey}`,
      },
      body: JSON.stringify(payload),
    })
    if (!res.ok) {
      return {
        outcome: 'failed',
        error: `client_error_bridge investigator webhook failed: HTTP ${res.status}`,
      }
    }
    return { outcome: 'sent' }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'client_error_bridge_dispatch_failed'
    return { outcome: 'failed', error: message }
  }
}
