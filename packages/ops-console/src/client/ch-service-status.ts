import type { OpsProbeSnapshot } from './ops.types.js'

export type ChServiceState = 'up' | 'degraded' | 'down' | 'unknown'

export type ChServicesStatusPayload = {
  checkedAt: string
  backend: ChServiceState
  web: ChServiceState
  apiPort: number
  webPort: number
}

const API_SLOW_MS = 3000
const WEB_SLOW_MS = 4000

function toneFromHttp(ok: boolean, latencyMs: number, slowMs: number): ChServiceState {
  if (!ok) return 'down'
  if (latencyMs > slowMs) return 'degraded'
  return 'up'
}

export function servicesFromProbe(probe?: OpsProbeSnapshot): {
  backend: ChServiceState
} {
  if (!probe?.api) return { backend: 'unknown' }
  return {
    backend: toneFromHttp(probe.api.ok, probe.api.latencyMs ?? 0, API_SLOW_MS),
  }
}

export function mergeServicesStatus(
  probe?: OpsProbeSnapshot,
  remote?: ChServicesStatusPayload | null,
): { backend: ChServiceState; web: ChServiceState } {
  if (remote) {
    return { backend: remote.backend, web: remote.web }
  }
  const fromProbe = servicesFromProbe(probe)
  return { backend: fromProbe.backend, web: 'unknown' }
}

export const CH_SERVICE_LABELS: Record<ChServiceState, string> = {
  up: 'UP',
  degraded: 'Degraded',
  down: 'Down',
  unknown: '—',
}
