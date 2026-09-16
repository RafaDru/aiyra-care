import type { AnalysisQueueSourceType } from './ops-analysis-queue.types.js'

/** Chave única de correlação — sempre `ops_analysis_queue.id` (UUID). */
export type InvestigationId = string

export function formatInvestigationIdShort(id: string): string {
  return id.slice(0, 8)
}

export function resolveInvestigationIdFromCallback(input: {
  investigationId?: string
  queueId?: string
}): string | undefined {
  const raw = input.investigationId?.trim() || input.queueId?.trim()
  return raw?.length ? raw : undefined
}

export function resolveInvestigationIdFromPayload(input: {
  investigationId?: string
  analysisQueue?: { id?: string }
}): string | undefined {
  const raw = input.investigationId?.trim() || input.analysisQueue?.id?.trim()
  return raw?.length ? raw : undefined
}

export interface OpsConsoleLinkParams {
  tab?: 'support' | 'issues' | 'infra' | 'overview'
  investigationId?: string
  reportId?: string
  alertId?: string
}

export function buildOpsConsoleUrl(baseUrl: string, params: OpsConsoleLinkParams = {}): string {
  const base = baseUrl.replace(/\/$/, '').replace(/\?.*$/, '')
  const search = new URLSearchParams()
  if (params.tab) search.set('tab', params.tab)
  if (params.investigationId) search.set('investigationId', params.investigationId)
  if (params.reportId) search.set('reportId', params.reportId)
  if (params.alertId) search.set('alertId', params.alertId)
  const qs = search.toString()
  return qs ? `${base}?${qs}` : base
}

export function investigationArtifactBasename(
  investigationId: string,
  sourceType: AnalysisQueueSourceType,
  sourceId: string,
): string {
  const date = new Date().toISOString().slice(0, 10)
  const short = formatInvestigationIdShort(investigationId)
  if (sourceType === 'support_report') {
    return `${date}-${short}-support.md`
  }
  return `${date}-${short}-${sourceId}.md`
}
