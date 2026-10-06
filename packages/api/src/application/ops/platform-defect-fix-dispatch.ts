import {
  resolveDefectFixAutomationWebhookKey,
  resolveDefectFixAutomationWebhookUrl,
} from '../../domain/ops/cursor-automation-env.js'
import {
  isDefectFixTier1Enabled,
  type InvestigationTier,
} from '../../domain/ops/investigator-tier.js'
import type { InvestigatorEnvironmentContext } from '../../domain/ops/investigator-environment.js'
import { resolveInvestigatorEnvironmentContext } from '../../domain/ops/investigator-environment.js'
import type { PlatformDefectRecord } from '../../domain/ops/platform-defect.types.js'
import type { PlatformDefectPgRepository } from '../../infrastructure/persistence/platform-defect.pg.repository.js'
import {
  resolveInvestigatorCallbackAuth,
  resolveInvestigatorCallbackUrl,
} from './ops-analysis-callback-url.js'
import {
  PlatformDefectService,
  PlatformDefectTransitionError,
} from './platform-defect.service.js'

export type PlatformDefectFixDispatchResult =
  | { outcome: 'sent' }
  | { outcome: 'skipped'; reason: 'webhook_not_configured' | 'webhook_key_missing' | 'callback_auth_missing' }
  | { outcome: 'failed'; error: string }

export interface PlatformDefectFixDispatchPayload {
  type: 'defect_fix_v1'
  defectId: string
  defect: {
    referenceCode: string | null
    title: string
    fingerprint: string | null
    triageSummary: string | null
    triageArtifactPath: string | null
    applications: string[]
  }
  linkedIncidentIds: string[]
  priorCorrectionFailure?: {
    summary: string | null
    details: Record<string, unknown>
  }
  ciFailure?: {
    runUrl: string
    failedJobs: string[]
  }
  environment: InvestigatorEnvironmentContext
  callbackUrl: string
  callbackAuth: { header: string; value: string }
  playbook: string
  investigation: { tier: InvestigationTier; playbook: string; trigger: 'manual' }
  text: string
}

export function resolvePlatformDefectFixWebhookUrl(): string | undefined {
  return resolveDefectFixAutomationWebhookUrl()
}

export function resolvePlatformDefectFixWebhookKey(): string | undefined {
  return resolveDefectFixAutomationWebhookKey()
}

export function resolvePlatformDefectFixTier(_defect: PlatformDefectRecord): InvestigationTier {
  return isDefectFixTier1Enabled() ? 1 : 0
}

export function defectFixPlaybookId(tier: InvestigationTier): string {
  return tier === 1 ? 'defect-fix-tier1' : 'defect-fix-tier0'
}

export function buildPlatformDefectFixDispatchPayload(
  defect: PlatformDefectRecord,
  linkedIncidentIds: string[],
): PlatformDefectFixDispatchPayload | { error: 'callback_auth_missing' } {
  const callbackAuth = resolveInvestigatorCallbackAuth()
  if (!callbackAuth) {
    return { error: 'callback_auth_missing' }
  }
  const tier = resolvePlatformDefectFixTier(defect)
  const playbook = defectFixPlaybookId(tier)
  const shortId = defect.id.slice(0, 8)
  const defectTag = `[defect:${shortId}]`
  const text = defect.referenceCode
    ? `${defect.referenceCode} · ${defectTag} Correção: ${defect.title}`
    : `${defectTag} Correção: ${defect.title}`
  return {
    type: 'defect_fix_v1',
    defectId: defect.id,
    defect: {
      referenceCode: defect.referenceCode,
      title: defect.title,
      fingerprint: defect.fingerprint,
      triageSummary: defect.triageSummary,
      triageArtifactPath: defect.triageArtifactPath,
      applications: defect.applications,
    },
    linkedIncidentIds,
    ...(defect.lastCorrectionFailureDetails
      ? {
          priorCorrectionFailure: {
            summary: defect.lastFailureSummary,
            details: { ...defect.lastCorrectionFailureDetails },
          },
        }
      : {}),
    ...(defect.lastFailureKind === 'ci' && defect.lastCiRunUrl
      ? {
          ciFailure: {
            runUrl: defect.lastCiRunUrl,
            failedJobs: Array.isArray(defect.lastFailureDetails?.failedJobs)
              ? (defect.lastFailureDetails.failedJobs as unknown[]).map(String)
              : [],
          },
        }
      : {}),
    environment: resolveInvestigatorEnvironmentContext(),
    callbackUrl: resolveInvestigatorCallbackUrl(),
    callbackAuth,
    playbook,
    investigation: { tier, playbook, trigger: 'manual' },
    text,
  }
}

export async function postPlatformDefectFixWebhook(
  url: string,
  payload: PlatformDefectFixDispatchPayload,
  options?: { bearerKey?: string },
): Promise<void> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' }
  if (options?.bearerKey) {
    headers.Authorization = `Bearer ${options.bearerKey}`
  }
  const res = await fetch(url, {
    method: 'POST',
    headers,
    body: JSON.stringify(payload),
  })
  if (!res.ok) {
    const bodySnippet = (await res.text()).replace(/\s+/g, ' ').slice(0, 400)
    const detail = bodySnippet ? ` — ${bodySnippet}` : ''
    throw new Error(`defect_fix webhook failed (${url}): HTTP ${res.status}${detail}`)
  }
}

export async function dispatchPlatformDefectFix(
  defect: PlatformDefectRecord,
  linkedIncidentIds: string[],
): Promise<PlatformDefectFixDispatchResult> {
  const webhook = resolvePlatformDefectFixWebhookUrl()
  if (!webhook) {
    return { outcome: 'skipped', reason: 'webhook_not_configured' }
  }
  const bearerKey = resolvePlatformDefectFixWebhookKey()
  if (!bearerKey) {
    return { outcome: 'skipped', reason: 'webhook_key_missing' }
  }
  const built = buildPlatformDefectFixDispatchPayload(defect, linkedIncidentIds)
  if ('error' in built) {
    return { outcome: 'skipped', reason: 'callback_auth_missing' }
  }
  try {
    await postPlatformDefectFixWebhook(webhook, built, { bearerKey })
    return { outcome: 'sent' }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'defect_fix_dispatch_failed'
    console.error('[platform-defect-fix-dispatch]', message)
    return { outcome: 'failed', error: message }
  }
}

/** Webhook aceito (`sent`) antes de `open` → `in_fix`. Em `in_fix`, só re-dispatch (retry). */
export async function startPlatformDefectFixWithDispatch(
  service: PlatformDefectService,
  repo: PlatformDefectPgRepository,
  defectId: string,
): Promise<{ item: PlatformDefectRecord; dispatch: PlatformDefectFixDispatchResult }> {
  const defect = await repo.findById(defectId)
  if (!defect) throw new PlatformDefectTransitionError('not_found')

  const linkedIncidentIds = await repo.listLinkedIncidentIds(defectId)
  const dispatch = await dispatchPlatformDefectFix(defect, linkedIncidentIds)

  if (defect.status === 'open') {
    if (dispatch.outcome !== 'sent') {
      return { item: defect, dispatch }
    }
    const item = await service.startFix(defectId)
    return { item, dispatch }
  }

  if (defect.status === 'in_fix') {
    if (dispatch.outcome === 'sent') {
      const refreshed = await repo.markFixDispatchSent(defectId)
      return { item: refreshed ?? defect, dispatch }
    }
    return { item: defect, dispatch }
  }

  throw new PlatformDefectTransitionError('invalid_transition')
}

export function dispatchErrorMessage(result: PlatformDefectFixDispatchResult): string | null {
  if (result.outcome === 'failed') return result.error
  if (result.outcome === 'skipped') {
    if (result.reason === 'webhook_not_configured') {
      return 'CURSOR_DEFECT_FIX_AUTOMATION_WEBHOOK_URL não configurado'
    }
    if (result.reason === 'webhook_key_missing') {
      return 'CURSOR_DEFECT_FIX_AUTOMATION_WEBHOOK_KEY não configurado'
    }
    if (result.reason === 'callback_auth_missing') {
      return 'OPS_INVESTIGATOR_CALLBACK_KEY ou OPS_METRICS_KEY não configurado'
    }
  }
  return null
}
