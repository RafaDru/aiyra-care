export type DevAuditKind = 'sessions' | 'edits' | 'shell' | 'tools'

export interface DevAuditRecord {
  ts: string
  event?: string
  kind: DevAuditKind
  tool?: string | null
  path?: string | null
  filePath?: string | null
  command?: string | null
  error?: string | null
}

export interface DevAuditAreaCount {
  area: string
  count: number
}

export interface DevAuditBridgeHourlyRow {
  hour: string
  auditEvents: number
  productEvents: number
  aligned: boolean
}

export interface DevAuditBridgeReport {
  generatedAt: string
  windowHours: number
  deploymentTier: string
  audit: {
    totalEvents: number
    byKind: Record<DevAuditKind, number>
    byEvent: Record<string, number>
    editsByArea: DevAuditAreaCount[]
    topEditedPaths: Array<{ path: string; count: number }>
    sessions: number
    blockedOrErrors: number
  }
  productEvents: {
    total: number
    byName: Record<string, number>
    hourly: Array<{ hour: string; count: number }>
  }
  correlation: {
    hourly: DevAuditBridgeHourlyRow[]
    peakAuditHour: string | null
    peakProductHour: string | null
    alignedHours: number
  }
  hints: string[]
}
