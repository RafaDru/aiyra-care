import type { OpsEnvTarget } from './ops-env-targets.js'
import { resolveOpsMetricsKeyForTarget } from './ops-env-targets.js'

export type RemoteMetricsResult = {
  ok: true
  data: unknown
  targetId: string
  fetchedAt: string
} | {
  ok: false
  targetId: string
  error: string
  status?: number
}

export async function fetchRemoteOpsMetrics(target: OpsEnvTarget): Promise<RemoteMetricsResult> {
  if (!target.enabled) {
    return { ok: false, targetId: target.id, error: 'Ambiente desabilitado' }
  }
  const base = target.apiBase.replace(/\/$/, '')
  if (!base) {
    return { ok: false, targetId: target.id, error: 'apiBase não configurado' }
  }

  const headers: Record<string, string> = { Accept: 'application/json' }
  const opsKey = resolveOpsMetricsKeyForTarget(target)
  if (opsKey) headers['x-internal-ops-key'] = opsKey

  try {
    const res = await fetch(`${base}/ops/metrics`, {
      headers,
      signal: AbortSignal.timeout(15_000),
    })
    if (!res.ok) {
      const text = await res.text().catch(() => '')
      return {
        ok: false,
        targetId: target.id,
        error: text || `HTTP ${res.status}`,
        status: res.status,
      }
    }
    const data = await res.json()
    return {
      ok: true,
      data,
      targetId: target.id,
      fetchedAt: new Date().toISOString(),
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Falha ao consultar API'
    return { ok: false, targetId: target.id, error: message }
  }
}
