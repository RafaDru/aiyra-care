import type { OpsAlert } from '../../domain/ops/ops-metrics.types.js'
import type { OpsProbeSnapshot } from '../../domain/ops/ops-metrics.types.js'
import { isOpsProbeDegraded } from './ops-probe.service.js'
import {
  AVA_LITE_TTL_MS,
  DEGRADED_READ_TTL_MS,
  PORTAL_DEGRADED_TTL_MS,
  type PortalDegradedEntry,
  type RuntimeDegradedPublicView,
  type RuntimeDegradedStateValue,
} from '../../domain/ops/runtime-degraded.types.js'
import type { RuntimeDegradedPgRepository } from '../../infrastructure/persistence/runtime-degraded.pg.repository.js'

function parseEnvPortals(): PortalDegradedEntry[] {
  const raw = process.env.SYNC_DEGRADED_PORTALS?.trim()
  if (!raw) return []
  return raw.split(',').map((p) => p.trim().toLowerCase()).filter(Boolean).map((portalType) => ({
    portalType,
    reason: 'env',
  }))
}

function isExpired(until: string | undefined): boolean {
  if (!until) return false
  return Date.now() > new Date(until).getTime()
}

function pruneExpired(state: RuntimeDegradedStateValue): RuntimeDegradedStateValue {
  const portals = (state.portals ?? []).filter((p) => !isExpired(p.until))
  const avaLite = state.avaLite?.active && !isExpired(state.avaLite.until)
    ? state.avaLite
    : undefined
  const degradedRead = state.degradedRead?.active && !isExpired(state.degradedRead.until)
    ? state.degradedRead
    : undefined
  return { portals, avaLite, degradedRead }
}

export function buildRuntimeStateFromOps(
  alerts: OpsAlert[],
  probe?: OpsProbeSnapshot,
  previous?: RuntimeDegradedStateValue | null,
): RuntimeDegradedStateValue {
  const now = Date.now()
  const portals: PortalDegradedEntry[] = [...(previous?.portals ?? [])]

  for (const alert of alerts) {
    if (alert.id.startsWith('sync_fail_rate_') && alert.severity === 'critical') {
      const portalType = String(alert.details?.portalType ?? alert.id.replace('sync_fail_rate_', ''))
      portals.push({
        portalType,
        reason: 'fail_rate',
        until: new Date(now + PORTAL_DEGRADED_TTL_MS).toISOString(),
      })
    }
  }

  const mergedPortals = new Map<string, PortalDegradedEntry>()
  for (const p of portals) {
    mergedPortals.set(p.portalType, p)
  }
  for (const p of parseEnvPortals()) {
    mergedPortals.set(p.portalType, p)
  }

  let avaLite = previous?.avaLite
  if (alerts.some((a) => a.id === 'llm_cascade_fail')) {
    avaLite = {
      active: true,
      reason: 'llm_cascade_fail',
      until: new Date(now + AVA_LITE_TTL_MS).toISOString(),
    }
  } else if (process.env.AVA_LITE_MODE === '1') {
    avaLite = { active: true, reason: 'env' }
  }

  let degradedRead = previous?.degradedRead
  if (probe && isOpsProbeDegraded(probe)) {
    const yesterday = new Date(now - 24 * 60 * 60 * 1000)
    degradedRead = {
      active: true,
      asOf: yesterday.toISOString().slice(0, 10),
      reason: 'infra_probe',
      until: new Date(now + DEGRADED_READ_TTL_MS).toISOString(),
    }
  } else if (process.env.DEGRADED_READ_MODE === '1') {
    const yesterday = new Date(now - 24 * 60 * 60 * 1000)
    degradedRead = {
      active: true,
      asOf: yesterday.toISOString().slice(0, 10),
      reason: 'env',
    }
  }

  return pruneExpired({
    portals: [...mergedPortals.values()],
    avaLite,
    degradedRead,
  })
}

export class RuntimeDegradedService {
  private cache: RuntimeDegradedPublicView | null = null
  private cacheAt = 0
  private readonly cacheTtlMs = 15_000

  constructor(private readonly repo: RuntimeDegradedPgRepository) {}

  async getPublicView(): Promise<RuntimeDegradedPublicView> {
    if (this.cache && Date.now() - this.cacheAt < this.cacheTtlMs) {
      return this.cache
    }
    const stored = await this.repo.loadState()
    const pruned = pruneExpired(stored ?? { portals: [] })
    const envPortals = parseEnvPortals()
    const portalSet = new Set<string>()
    for (const p of pruned.portals) portalSet.add(p.portalType)
    for (const p of envPortals) portalSet.add(p.portalType)

    const avaLiteEnv = process.env.AVA_LITE_MODE === '1'
    const avaLite = pruned.avaLite?.active || avaLiteEnv
    const degradedReadEnv = process.env.DEGRADED_READ_MODE === '1'
    const degradedRead = pruned.degradedRead?.active || degradedReadEnv

    this.cache = {
      avaLite,
      avaLiteReason: avaLite
        ? (pruned.avaLite?.reason ?? (avaLiteEnv ? 'env' : null))
        : null,
      degradedRead,
      degradedReadAsOf: degradedRead
        ? (pruned.degradedRead?.asOf ?? new Date(Date.now() - 86400000).toISOString().slice(0, 10))
        : null,
      degradedReadReason: degradedRead
        ? (pruned.degradedRead?.reason ?? (degradedReadEnv ? 'env' : null))
        : null,
      syncDegradedPortals: [...portalSet],
    }
    this.cacheAt = Date.now()
    return this.cache
  }

  async isPortalSyncDegraded(portalType: string): Promise<boolean> {
    const view = await this.getPublicView()
    return view.syncDegradedPortals.includes(portalType.toLowerCase())
  }

  async isAvaLiteActive(): Promise<boolean> {
    const view = await this.getPublicView()
    return view.avaLite
  }

  async isDegradedReadActive(): Promise<boolean> {
    const view = await this.getPublicView()
    return view.degradedRead
  }

  async applyFromOps(alerts: OpsAlert[], probe?: OpsProbeSnapshot): Promise<void> {
    const previous = await this.repo.loadState()
    const next = buildRuntimeStateFromOps(alerts, probe, previous)
    await this.repo.saveState(next)
    this.cache = null
  }

  async findDegradedReadSnapshot(patientId: string) {
    return this.repo.findDegradedReadSnapshot(patientId)
  }
}
