export type OpsUsageGranularity = '15m' | '1h' | '1d'

export type OpsUsagePreset = 'today' | '7d' | '30d' | 'custom'

export interface OpsUsageSurfaceRow {
  surface: string
  sessions: number
  accounts: number
}

export interface OpsUsageMinuteBucket {
  minute: string
  count: number
}

export interface OpsUsageLiveSnapshot {
  generatedAt: string
  windowMinutes: number
  activeAccounts: number
  activeSessions: number
  anonymousSessions: number
  bySurface: OpsUsageSurfaceRow[]
  eventsPerMinuteLastHour: OpsUsageMinuteBucket[]
}

export interface OpsUsageSeriesBucket {
  bucketStart: string
  activeAccounts: number
  activeSessions: number
  screenViews: number
  totalEvents: number
  clientErrors: number
}

export interface OpsUsageTimeSeries {
  from: string
  to: string
  granularity: OpsUsageGranularity
  preset: OpsUsagePreset
  series: OpsUsageSeriesBucket[]
}

export interface OpsUsageHeatmapCell {
  bucketStart: string
  sessionCount: number
  accountCount: number
  eventCount: number
  failRatePct: number | null
}

export interface OpsUsageHeatmapRow {
  area: string
  cells: OpsUsageHeatmapCell[]
}

export interface OpsUsageHeatmap {
  from: string
  to: string
  granularity: OpsUsageGranularity
  preset: OpsUsagePreset
  rows: OpsUsageHeatmapRow[]
}

export interface OpsUsageResponse {
  live: OpsUsageLiveSnapshot
  series?: OpsUsageTimeSeries
  heatmap?: OpsUsageHeatmap
}