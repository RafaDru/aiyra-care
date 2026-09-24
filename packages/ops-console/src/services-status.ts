const API_SLOW_MS = Number(process.env.OPS_PROBE_API_SLOW_MS ?? '3000')
const WEB_SLOW_MS = Number(process.env.OPS_PROBE_WEB_SLOW_MS ?? '4000')

export type ServiceState = 'up' | 'degraded' | 'down'

function tone(ok: boolean, latencyMs: number, slowMs: number): ServiceState {
  if (!ok) return 'down'
  if (latencyMs > slowMs) return 'degraded'
  return 'up'
}

async function probeUrl(url: string): Promise<{ ok: boolean; latencyMs: number }> {
  const start = Date.now()
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(12_000) })
    return { ok: res.ok, latencyMs: Date.now() - start }
  } catch {
    return { ok: false, latencyMs: Date.now() - start }
  }
}

export function resolveMonitoredPorts(consolePort: number): { apiPort: number; webPort: number } {
  if (consolePort === 3023) return { apiPort: 3020, webPort: 5174 }
  const apiPort = Number(process.env.PORT ?? '3010')
  const webPort = Number(process.env.AIYRA_STACK_WEB_PORT ?? '5173')
  return {
    apiPort: Number.isFinite(apiPort) ? apiPort : 3010,
    webPort: Number.isFinite(webPort) ? webPort : 5173,
  }
}

export async function fetchServicesStatus(consolePort: number) {
  const { apiPort, webPort } = resolveMonitoredPorts(consolePort)
  const apiBase = (process.env.API_PUBLIC_URL ?? `http://127.0.0.1:${apiPort}`).replace(/\/$/, '')
  const webBase = (process.env.WEB_PUBLIC_URL ?? `http://127.0.0.1:${webPort}`).replace(/\/$/, '')

  const [api, web] = await Promise.all([
    probeUrl(`${apiBase}/health`),
    probeUrl(webBase),
  ])

  return {
    checkedAt: new Date().toISOString(),
    backend: tone(api.ok, api.latencyMs, API_SLOW_MS),
    web: tone(web.ok, web.latencyMs, WEB_SLOW_MS),
    apiPort,
    webPort,
  }
}
