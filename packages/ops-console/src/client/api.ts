import type {
  OpsAlertsDispatchResult,
  OpsMetricsResponse,
  ProductLifecycleSnapshot,
  ProductMaturityBoardSnapshot,
  GrowthConsultorioBoardSnapshot,
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
  plannedMaintenance?: boolean
  readOnly?: boolean
  chG3RequireReviewApprove?: boolean
  chG3AgenticAutoApprove?: boolean
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
  incidentDefectCycleMetrics: (windowDays = 7) =>
    request<import('./ops.types.js').IncidentDefectCycleMetrics>(
      `/api/ops/incident-defect-cycle-metrics?windowDays=${encodeURIComponent(String(windowDays))}`,
    ),
  productLifecycle: () => request<ProductLifecycleSnapshot>('/api/product-lifecycle'),
  productMaturityBoard: () =>
    request<ProductMaturityBoardSnapshot>('/api/product-maturity-board'),
  growthConsultorioBoard: () =>
    request<GrowthConsultorioBoardSnapshot>('/api/growth-consultorio-board'),
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
  analysisQueue: (params?: {
    filter?: import('./ch-incident-board-filter.js').IncidentBoardFilter
    ensureId?: string
  }) => {
    const q = new URLSearchParams()
    if (params?.filter) q.set('filter', params.filter)
    if (params?.ensureId) q.set('ensureId', params.ensureId)
    const suffix = q.toString() ? `?${q.toString()}` : ''
    return request<{
      items: import('./ops.types.js').OpsAnalysisQueueItem[]
      filter: import('./ch-incident-board-filter.js').IncidentBoardFilter
    }>(`/api/analysis-queue${suffix}`)
  },
  analysisQueueItem: (id: string) =>
    request<{ item: import('./ops.types.js').OpsAnalysisQueueItem }>(
      `/api/analysis-queue/${encodeURIComponent(id)}`,
    ),
  analysisQueueByRef: (ref: string) =>
    request<{ item: import('./ops.types.js').OpsAnalysisQueueItem }>(
      `/api/analysis-queue/by-ref/${encodeURIComponent(ref)}`,
    ),
  searchAnalysisQueue: (query: string) =>
    request<{ items: import('./ops.types.js').OpsAnalysisQueueItem[] }>(
      `/api/analysis-queue/search?q=${encodeURIComponent(query)}`,
    ),
  incidentDispatchHealth: () =>
    request<import('./ops.types.js').IncidentDispatchHealth>('/api/incident-dispatch/health'),
  analysisAttentionCounts: () =>
    request<import('./ops.types.js').OpsAnalysisAttentionCounts>(
      '/api/analysis-queue/attention-counts',
    ),
  completeAnalysisQueueItem: (id: string) =>
    request<{ ok: boolean }>(`/api/analysis-queue/${encodeURIComponent(id)}/complete`, {
      method: 'POST',
    }),
  retryAnalysisQueueDispatch: (id: string, options?: { runTick?: boolean }) =>
    request<{ ok: boolean }>(`/api/analysis-queue/${encodeURIComponent(id)}/retry-dispatch`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ runTick: options?.runTick === true }),
    }),
  platformDefects: (params?: { status?: string; includeFixed?: boolean; q?: string }) => {
    const q = new URLSearchParams()
    if (params?.q) q.set('q', params.q)
    if (params?.status) q.set('status', params.status)
    if (params?.includeFixed) q.set('includeFixed', '1')
    const suffix = q.toString() ? `?${q.toString()}` : ''
    return request<{ items: import('./ops.types.js').PlatformDefectItem[] }>(
      `/api/platform-defects${suffix}`,
    )
  },
  platformDefectByRef: (ref: string) =>
    request<{ item: import('./ops.types.js').PlatformDefectItem }>(
      `/api/platform-defects/by-ref/${encodeURIComponent(ref)}`,
    ),
  platformDefectDetail: (id: string) =>
    request<{
      defect: import('./ops.types.js').PlatformDefectItem
      incidents: Array<{ id: string; title: string; referenceCode: string | null }>
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
    request<{
      ok: boolean
      item: import('./ops.types.js').PlatformDefectItem
      dispatch?: {
        outcome: 'sent' | 'skipped' | 'failed'
        reason?: string
        error?: string
      }
    }>(`/api/platform-defects/${encodeURIComponent(id)}/start-fix`, { method: 'POST' }),
  requestPlatformDefectPrReview: (id: string, body?: { force?: boolean }) =>
    request<{
      ok: boolean
      outcome: 'sent' | 'skipped'
      reason?: string
      reviewId?: string
      item: import('./ops.types.js').PlatformDefectItem
    }>(`/api/platform-defects/${encodeURIComponent(id)}/request-review`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body ?? {}),
    }),
  operatorApprovePlatformDefectPr: (
    id: string,
    body?: { note?: string; override?: boolean; overrideReason?: string },
  ) =>
    request<{
      ok: boolean
      prUrl: string | null
      message: string
      item: import('./ops.types.js').PlatformDefectItem
    }>(`/api/platform-defects/${encodeURIComponent(id)}/operator-approve-pr`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body ?? {}),
    }),
  operatorRequestChangesPlatformDefectPr: (id: string, body?: { note?: string }) =>
    request<{
      ok: boolean
      item: import('./ops.types.js').PlatformDefectItem
    }>(`/api/platform-defects/${encodeURIComponent(id)}/operator-request-changes`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body ?? {}),
    }),
  registerPlatformDefectPr: (id: string, prUrl: string) =>
    request<{ ok: boolean; item: import('./ops.types.js').PlatformDefectItem }>(
      `/api/platform-defects/${encodeURIComponent(id)}/register-pr`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prUrl }),
      },
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
