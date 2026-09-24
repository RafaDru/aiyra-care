import type {
  OpsAlertsDispatchResult,
  OpsMetricsResponse,
  ProductLifecycleSnapshot,
  StackActionResult,
  StrategyContentPayload,
  StrategyManifestResponse,
  StrategySectionId,
} from './ops.types.js'
import type { OpsDeploymentTier } from './theme/ops-environment.js'

export type OpsConsoleHealth = {
  service: string
  status: string
  port: number
  deploymentTier: OpsDeploymentTier
  layoutVersion?: string
}

export type ChServicesStatusResponse = {
  checkedAt: string
  backend: 'up' | 'degraded' | 'down'
  web: 'up' | 'degraded' | 'down'
  apiPort: number
  webPort: number
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
      const body = JSON.parse(text) as { error?: string; message?: string }
      if (body.message) message = body.message
      else if (body.error) message = body.error
    } catch {
      if (text) message = `${message}: ${text}`
    }
    throw new Error(message)
  }
  return res.json() as Promise<T>
}

export const opsApi = {
  health: () => request<OpsConsoleHealth>('/health'),
  servicesStatus: () => request<ChServicesStatusResponse>('/api/services/status'),
  metrics: () => request<OpsMetricsResponse>('/api/metrics'),
  productLifecycle: () => request<ProductLifecycleSnapshot>('/api/product-lifecycle'),
  strategyManifest: () => request<StrategyManifestResponse>('/api/strategy/manifest'),
  strategyContent: (section: StrategySectionId) =>
    request<StrategyContentPayload>(`/api/strategy/content/${encodeURIComponent(section)}`),
  dispatchCheck: () =>
    request<OpsAlertsDispatchResult>('/api/alerts/check', { method: 'POST' }),
  analyzeOpsAlert: (id: string, operatorNotes?: string) =>
    request<{ ok: boolean; analysisStatus: string; message: string }>(
      `/api/ops-alerts/${encodeURIComponent(id)}/analyze`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ operatorNotes }),
      },
    ),
  completeOpsAlertAnalysis: (
    id: string,
    payload: { analysisSummary?: string; analysisArtifactPath?: string },
  ) =>
    request<{ ok: boolean }>(`/api/ops-alerts/${encodeURIComponent(id)}/complete-analysis`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    }),
  stackStatus: () => request<StackActionResult>('/api/stack/status'),
  stackAction: (action: 'start' | 'stop' | 'restart') =>
    request<StackActionResult>(`/api/stack/${action}`, { method: 'POST' }),
  supportReports: (status = 'open') =>
    request<{ reports: import('./ops.types.js').SupportReportOpsRow[] }>(
      `/api/support-reports?status=${encodeURIComponent(status)}`,
    ),
  updateSupportReport: (id: string, status: 'triaged' | 'resolved' | 'closed') =>
    request<{ ok: boolean }>(`/api/support-reports/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    }),
  analyzeSupportReport: (id: string, operatorNotes?: string) =>
    request<{ ok: boolean; analysisStatus: string; message: string }>(
      `/api/support-reports/${id}/analyze`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ operatorNotes }),
      },
    ),
  completeSupportAnalysis: (
    id: string,
    payload: {
      analysisSummary?: string
      analysisArtifactPath?: string
      deploymentStatus?: string
      deploymentActions?: Array<{ label: string; kind: string; url?: string; done?: boolean }>
    },
  ) =>
    request<{ ok: boolean }>(`/api/support-reports/${id}/complete-analysis`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    }),
  analysisQueue: () =>
    request<{ items: import('./ops.types.js').OpsAnalysisQueueItem[] }>('/api/analysis-queue'),
  analysisAttentionCounts: () =>
    request<import('./ops.types.js').OpsAnalysisAttentionCounts>(
      '/api/analysis-queue/attention-counts',
    ),
  completeAnalysisQueueItem: (id: string) =>
    request<{ ok: boolean }>(`/api/analysis-queue/${encodeURIComponent(id)}/complete`, {
      method: 'POST',
    }),
  platformDefects: (params?: { status?: string; includeFixed?: boolean }) => {
    const q = new URLSearchParams()
    if (params?.status) q.set('status', params.status)
    if (params?.includeFixed) q.set('includeFixed', '1')
    const suffix = q.toString() ? `?${q.toString()}` : ''
    return request<{ items: import('./ops.types.js').PlatformDefectItem[] }>(
      `/api/platform-defects${suffix}`,
    )
  },
  platformDefectDetail: (id: string) =>
    request<{
      defect: import('./ops.types.js').PlatformDefectItem
      incidents: Array<{ id: string; title: string }>
    }>(`/api/platform-defects/${encodeURIComponent(id)}`),
  patchPlatformDefectStatus: (
    id: string,
    body: {
      status: import('./ops.types.js').PlatformDefectStatus
      branchName?: string
      prUrl?: string
      skipBatch?: boolean
    },
  ) =>
    request<{ ok: boolean; item: import('./ops.types.js').PlatformDefectItem }>(
      `/api/platform-defects/${encodeURIComponent(id)}/status`,
      {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      },
    ),
  startPlatformDefectFix: (id: string) =>
    request<{ ok: boolean; item: import('./ops.types.js').PlatformDefectItem }>(
      `/api/platform-defects/${encodeURIComponent(id)}/start-fix`,
      { method: 'POST' },
    ),
  defectPrBatchConfig: () =>
    request<{
      intervalMs: number
      readyCount: number
      nextWindowAt: string
    }>('/api/defect-pr-batches/config'),
  runDefectPrBatch: () =>
    request<{
      ok: boolean
      batch: import('./ops.types.js').DefectPrBatchItem | null
      defectIds: string[]
      count: number
    }>('/api/defect-pr-batches/run', { method: 'POST' }),
}
