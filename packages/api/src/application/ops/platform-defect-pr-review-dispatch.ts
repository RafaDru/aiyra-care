import {
  resolveDefectPrReviewAutomationWebhookKey,
  resolveDefectPrReviewAutomationWebhookUrl,
} from '../../domain/ops/cursor-automation-env.js'
import {
  isDefectFixTier1Enabled,
  type InvestigationTier,
} from '../../domain/ops/investigator-tier.js'
import type { InvestigatorEnvironmentContext } from '../../domain/ops/investigator-environment.js'
import { resolveInvestigatorEnvironmentContext } from '../../domain/ops/investigator-environment.js'
import type { PlatformDefectRecord } from '../../domain/ops/platform-defect.types.js'
import {
  resolveDefectPrReviewCallbackUrl,
  resolveInvestigatorCallbackAuth,
} from './ops-analysis-callback-url.js'

export type PlatformDefectPrReviewDispatchResult =
  | { outcome: 'sent' }
  | {
      outcome: 'skipped'
      reason:
        | 'webhook_not_configured'
        | 'webhook_key_missing'
        | 'callback_auth_missing'
    }
  | { outcome: 'failed'; error: string }

export interface PlatformDefectPrReviewDispatchPayload {
  type: 'defect_pr_review_v1'
  defectId: string
  reviewId: string
  defect: {
    referenceCode: string | null
    title: string
    fingerprint: string | null
    triageSummary: string | null
    triageArtifactPath: string | null
    applications: string[]
    remediationSummary: string | null
  }
  prUrl: string
  branchName: string | null
  investigationId: string | null
  linkedIncidents: Array<{ id: string; referenceCode: string | null; fingerprint: string | null }>
  diffScope: {
    mode: 'pr_files'
    baseRef: string
    headRef: string | null
    maxFiles: number
    notes: string
  }
  ciSnapshot: { status: string; runUrl?: string; failedJobs?: string[] }
  priorReview: null
  environment: InvestigatorEnvironmentContext
  callbackUrl: string
  callbackAuth: { header: string; value: string }
  playbook: string
  investigation: {
    tier: InvestigationTier
    playbook: string
    trigger: 'manual' | 'auto_ready' | 'batch'
  }
  text: string
}

export function resolvePlatformDefectPrReviewWebhookUrl(): string | undefined {
  return resolveDefectPrReviewAutomationWebhookUrl()
}

export function resolvePlatformDefectPrReviewWebhookKey(): string | undefined {
  return resolveDefectPrReviewAutomationWebhookKey()
}

export function defectPrReviewPlaybookId(tier: InvestigationTier): string {
  return tier === 1 ? 'defect-pr-review-tier1' : 'defect-pr-review-tier0'
}

export function resolvePlatformDefectPrReviewTier(_defect: PlatformDefectRecord): InvestigationTier {
  return isDefectFixTier1Enabled() ? 1 : 0
}

export function buildPlatformDefectPrReviewDispatchPayload(input: {
  defect: PlatformDefectRecord
  reviewId: string
  investigationId: string | null
  linkedIncidents: Array<{ id: string; referenceCode: string | null; fingerprint: string | null }>
  trigger: 'manual' | 'auto_ready' | 'batch'
}): PlatformDefectPrReviewDispatchPayload | { error: 'callback_auth_missing' } {
  const callbackAuth = resolveInvestigatorCallbackAuth()
  if (!callbackAuth) {
    return { error: 'callback_auth_missing' }
  }
  const { defect, reviewId, investigationId, linkedIncidents, trigger } = input
  const tier = resolvePlatformDefectPrReviewTier(defect)
  const playbook = defectPrReviewPlaybookId(tier)
  const shortId = defect.id.slice(0, 8)
  const defectTag = `[defect:${shortId}]`
  const text = defect.referenceCode
    ? `${defect.referenceCode} · ${defectTag} Revisão PR: ${defect.title}`
    : `${defectTag} Revisão PR: ${defect.title}`

  return {
    type: 'defect_pr_review_v1',
    defectId: defect.id,
    reviewId,
    defect: {
      referenceCode: defect.referenceCode,
      title: defect.title,
      fingerprint: defect.fingerprint,
      triageSummary: defect.triageSummary,
      triageArtifactPath: defect.triageArtifactPath,
      applications: defect.applications,
      remediationSummary: null,
    },
    prUrl: defect.prUrl!,
    branchName: defect.branchName,
    investigationId,
    linkedIncidents,
    diffScope: {
      mode: 'pr_files',
      baseRef: 'main',
      headRef: defect.branchName,
      maxFiles: 40,
      notes: 'Agente deve usar gh pr diff / API GitHub; não checkout PHI',
    },
    ciSnapshot: { status: 'unknown' },
    priorReview: null,
    environment: resolveInvestigatorEnvironmentContext(),
    callbackUrl: resolveDefectPrReviewCallbackUrl(),
    callbackAuth,
    playbook,
    investigation: { tier, playbook, trigger },
    text,
  }
}

export async function postPlatformDefectPrReviewWebhook(
  url: string,
  payload: PlatformDefectPrReviewDispatchPayload,
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
    throw new Error(`defect_pr_review webhook failed (${url}): HTTP ${res.status}${detail}`)
  }
}

export async function dispatchPlatformDefectPrReview(
  payload: PlatformDefectPrReviewDispatchPayload,
): Promise<PlatformDefectPrReviewDispatchResult> {
  const webhook = resolvePlatformDefectPrReviewWebhookUrl()
  if (!webhook) {
    return { outcome: 'skipped', reason: 'webhook_not_configured' }
  }
  const bearerKey = resolvePlatformDefectPrReviewWebhookKey()
  if (!bearerKey) {
    return { outcome: 'skipped', reason: 'webhook_key_missing' }
  }
  try {
    await postPlatformDefectPrReviewWebhook(webhook, payload, { bearerKey })
    return { outcome: 'sent' }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'defect_pr_review_dispatch_failed'
    console.error('[platform-defect-pr-review-dispatch]', message)
    return { outcome: 'failed', error: message }
  }
}

export function prReviewDispatchErrorMessage(
  result: PlatformDefectPrReviewDispatchResult,
): string | null {
  if (result.outcome === 'failed') return result.error
  if (result.outcome === 'skipped') {
    if (result.reason === 'webhook_not_configured') {
      return 'CURSOR_DEFECT_PR_REVIEW_AUTOMATION_WEBHOOK_URL não configurado'
    }
    if (result.reason === 'webhook_key_missing') {
      return 'CURSOR_DEFECT_PR_REVIEW_AUTOMATION_WEBHOOK_KEY não configurado'
    }
    if (result.reason === 'callback_auth_missing') {
      return 'OPS_INVESTIGATOR_CALLBACK_KEY ou OPS_METRICS_KEY não configurado'
    }
  }
  return null
}
