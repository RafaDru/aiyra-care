import {
  resolveOpsFeatureEntry,
  type OpsObservabilitySection,
} from './ops-feature-catalog.js'

export interface ProductEventUsageRow {
  route: string | null
  eventName: string
  eventCount: number
  sessionCount: number
}

export interface ClientErrorFeatureCountRow {
  feature: string
  errorCount: number
  accountCount: number
}

export type FeatureHealthSignal = 'hot' | 'errors_only' | 'ok' | 'low_signal'

export interface FeatureHealthRow {
  featureKey: string
  label: string
  area: string
  section: OpsObservabilitySection
  routeExample?: string
  usageEvents24h: number
  usageSessions24h: number
  errorCount24h: number
  accountCount24h: number
  failRatePct: number
  signal: FeatureHealthSignal
}

function round1(n: number): number {
  return Math.round(n * 10) / 10
}

function classifySignal(
  access: number,
  errorCount: number,
  failRatePct: number,
): FeatureHealthSignal {
  if (errorCount > 0 && access === 0) return 'errors_only'
  if (access < 3 && errorCount < 3) return 'low_signal'
  if (failRatePct >= 15 && access >= 5) return 'hot'
  if (failRatePct >= 25 && errorCount >= 3) return 'hot'
  return 'ok'
}

export function buildFeatureHealthMatrix(
  usageRows: ProductEventUsageRow[],
  errorRows: ClientErrorFeatureCountRow[],
  resolveFeature: (eventName: string, route?: string | null) => string,
): FeatureHealthRow[] {
  const usageByFeature = new Map<string, { events: number; sessions: number }>()
  for (const row of usageRows) {
    const key = resolveFeature(row.eventName, row.route)
    const agg = usageByFeature.get(key) ?? { events: 0, sessions: 0 }
    agg.events += row.eventCount
    agg.sessions += row.sessionCount
    usageByFeature.set(key, agg)
  }

  const errorsByFeature = new Map<string, { errorCount: number; accountCount: number }>()
  for (const row of errorRows) {
    const agg = errorsByFeature.get(row.feature) ?? { errorCount: 0, accountCount: 0 }
    agg.errorCount += row.errorCount
    agg.accountCount += row.accountCount
    errorsByFeature.set(row.feature, agg)
  }

  const keys = new Set<string>([...usageByFeature.keys(), ...errorsByFeature.keys()])

  const rows: FeatureHealthRow[] = []
  for (const featureKey of keys) {
    const usage = usageByFeature.get(featureKey) ?? { events: 0, sessions: 0 }
    const errors = errorsByFeature.get(featureKey) ?? { errorCount: 0, accountCount: 0 }
    const access = usage.sessions > 0 ? usage.sessions : usage.events
    const failRatePct =
      access > 0
        ? round1((100 * errors.errorCount) / access)
        : errors.errorCount > 0
          ? 100
          : 0
    const entry = resolveOpsFeatureEntry(featureKey)
    rows.push({
      featureKey,
      label: entry.label,
      area: entry.area,
      section: entry.section,
      routeExample: entry.routeExample,
      usageEvents24h: usage.events,
      usageSessions24h: usage.sessions,
      errorCount24h: errors.errorCount,
      accountCount24h: errors.accountCount,
      failRatePct,
      signal: classifySignal(access, errors.errorCount, failRatePct),
    })
  }

  return rows.sort((a, b) => {
    const signalOrder: Record<FeatureHealthSignal, number> = {
      hot: 0,
      errors_only: 1,
      ok: 2,
      low_signal: 3,
    }
    const sa = signalOrder[a.signal]
    const sb = signalOrder[b.signal]
    if (sa !== sb) return sa - sb
    if (b.failRatePct !== a.failRatePct) return b.failRatePct - a.failRatePct
    return b.errorCount24h - a.errorCount24h
  })
}
