import type { OpsAlertsDispatchResult, OpsMetricsResponse, StackActionResult } from './ops.types.js'
import type { OpsDeploymentTier } from './theme/ops-environment.js'

export type OpsConsoleHealth = {
  service: string
  status: string
  port: number
  deploymentTier: OpsDeploymentTier
}

function stackHeaders(): Record<string, string> {
  const key =
    (typeof localStorage !== 'undefined' ? localStorage.getItem('opsStackKey') : null) ??
    import.meta.env.VITE_OPS_CONSOLE_STACK_KEY
  if (!key) return {}
  return { 'x-ops-stack-key': key }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(path, {
    ...init,
    headers: { ...stackHeaders(), ...init?.headers },
  })
  if (!res.ok) {
    const text = await res.text().catch(() => '')
    let message = `HTTP ${res.status}`
    try {
      const body = JSON.parse(text) as { error?: string }
      if (body.error) message = body.error
    } catch {
      if (text) message = `${message}: ${text}`
    }
    throw new Error(message)
  }
  return res.json() as Promise<T>
}

export const opsApi = {
  health: () => request<OpsConsoleHealth>('/health'),
  metrics: () => request<OpsMetricsResponse>('/api/metrics'),
  dispatchCheck: () =>
    request<OpsAlertsDispatchResult>('/api/alerts/check', { method: 'POST' }),
  stackStatus: () => request<StackActionResult>('/api/stack/status'),
  stackAction: (action: 'start' | 'stop' | 'restart') =>
    request<StackActionResult>(`/api/stack/${action}`, { method: 'POST' }),
}
