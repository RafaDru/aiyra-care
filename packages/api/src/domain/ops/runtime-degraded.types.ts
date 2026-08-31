export interface PortalDegradedEntry {
  portalType: string
  reason: string
  until?: string
}

export interface RuntimeDegradedStateValue {
  portals: PortalDegradedEntry[]
  avaLite?: {
    active: boolean
    reason?: string
    until?: string
  }
  degradedRead?: {
    active: boolean
    asOf?: string
    reason?: string
    until?: string
  }
}

export interface RuntimeDegradedPublicView {
  avaLite: boolean
  avaLiteReason: string | null
  degradedRead: boolean
  degradedReadAsOf: string | null
  degradedReadReason: string | null
  syncDegradedPortals: string[]
}

export const RUNTIME_DEGRADED_KEYS = {
  state: 'degraded_state',
} as const

export const PORTAL_DEGRADED_TTL_MS = Number(
  process.env.SYNC_DEGRADED_TTL_MS ?? String(30 * 60 * 1000),
)

export const AVA_LITE_TTL_MS = Number(
  process.env.AVA_LITE_TTL_MS ?? String(30 * 60 * 1000),
)

export const DEGRADED_READ_TTL_MS = Number(
  process.env.DEGRADED_READ_TTL_MS ?? String(60 * 60 * 1000),
)
