import { isOpsPlannedMaintenanceActive } from '../../api/src/domain/ops/ops-planned-maintenance.js'
import { resolveMonitoredPorts } from './services-status.js'

export type PlannedMaintenanceSnapshot = {
  plannedMaintenance: boolean
  source: 'env' | 'api' | 'env_and_api'
}

/** v1: local env; optional corroboration from monitored API /health. */
export async function resolvePlannedMaintenance(
  consolePort: number,
): Promise<PlannedMaintenanceSnapshot> {
  const envActive = isOpsPlannedMaintenanceActive()
  if (!envActive) {
    return { plannedMaintenance: false, source: 'env' }
  }

  const { apiPort } = resolveMonitoredPorts(consolePort)
  const apiBase = (process.env.API_PUBLIC_URL ?? `http://127.0.0.1:${apiPort}`).replace(/\/$/, '')

  try {
    const res = await fetch(`${apiBase}/health`, { signal: AbortSignal.timeout(8_000) })
    if (!res.ok) {
      return { plannedMaintenance: true, source: 'env' }
    }
    const body = (await res.json()) as { plannedMaintenance?: boolean }
    if (body.plannedMaintenance === true) {
      return { plannedMaintenance: true, source: 'env_and_api' }
    }
    return { plannedMaintenance: true, source: 'env' }
  } catch {
    return { plannedMaintenance: true, source: 'env' }
  }
}

export function isOpsConsoleReadOnly(): boolean {
  return isOpsPlannedMaintenanceActive()
}
