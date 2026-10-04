export function resolveOpsConsoleBaseUrl(): string {
  const explicit = process.env.OPS_ALERT_DASHBOARD_URL?.trim()
    || process.env.OPS_CONSOLE_PUBLIC_URL?.trim()
  if (explicit) {
    let url = explicit.replace(/\/$/, '').split('?')[0]
    if (/:5173\/ops$/.test(url)) {
      const host = process.env.OPS_CONSOLE_HOST?.trim() || '127.0.0.1'
      const port = process.env.OPS_CONSOLE_PORT?.trim() || '3013'
      url = `http://${host}:${port}`
    }
    return url
  }
  const port = process.env.OPS_CONSOLE_PORT?.trim() || '3013'
  const host = process.env.OPS_CONSOLE_HOST?.trim() || '127.0.0.1'
  return `http://${host}:${port}`
}

export function resolveInvestigatorCallbackUrl(): string {
  return `${resolveOpsConsoleBaseUrl()}/api/analysis-queue/callback`
}

export function resolveInvestigatorTriageStartedUrl(queueId: string): string {
  const id = queueId.trim()
  return `${resolveOpsConsoleBaseUrl()}/api/analysis-queue/${encodeURIComponent(id)}/triage-started`
}

export interface InvestigatorAnalysisQueueUrls {
  id: string
  callbackUrl: string
  triageStartedUrl: string
}

export function resolveInvestigatorAnalysisQueueUrls(queueId: string): InvestigatorAnalysisQueueUrls {
  return {
    id: queueId,
    callbackUrl: resolveInvestigatorCallbackUrl(),
    triageStartedUrl: resolveInvestigatorTriageStartedUrl(queueId),
  }
}

/** Header + valor para a Automation POSTar no callback (sem expor segredo em logs). */
export function resolveInvestigatorCallbackAuth(): { header: string; value: string } | null {
  const investigatorKey = process.env.OPS_INVESTIGATOR_CALLBACK_KEY?.trim()
  if (investigatorKey) {
    return { header: 'x-investigator-callback-key', value: investigatorKey }
  }
  const opsKey = process.env.OPS_METRICS_KEY?.trim()
  if (opsKey) {
    return { header: 'x-internal-ops-key', value: opsKey }
  }
  return null
}

export function isInvestigatorCallbackAuthorized(headers: Record<string, string | undefined>): boolean {
  const callbackKey = process.env.OPS_INVESTIGATOR_CALLBACK_KEY?.trim()
  const opsKey = process.env.OPS_METRICS_KEY?.trim()
  const provided =
    headers['x-investigator-callback-key']?.trim()
    || headers['x-internal-ops-key']?.trim()
  if (!provided) return false
  if (callbackKey && provided === callbackKey) return true
  if (opsKey && provided === opsKey) return true
  return false
}
