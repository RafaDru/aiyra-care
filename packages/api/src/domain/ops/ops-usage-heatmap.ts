import { resolveOpsFeatureEntry } from './ops-feature-catalog.js'
import type {
  OpsUsageGranularity,
  OpsUsageHeatmap,
  OpsUsageHeatmapCell,
  OpsUsageHeatmapRow,
  OpsUsagePreset,
} from './ops-usage.types.js'

export interface UsageHeatmapFeatureBucketRow {
  featureKey: string
  bucketStart: Date
  sessionCount: number
  accountCount: number
  eventCount: number
}

export interface UsageHeatmapErrorBucketRow {
  feature: string
  bucketStart: Date
  errorCount: number
}

function bucketKey(d: Date): string {
  return d.toISOString()
}

const K_ANON = 5

function failRate(eventCount: number, errorCount: number, accountCount: number): number | null {
  const access = Math.max(eventCount, accountCount)
  if (access < K_ANON && errorCount > 0) return null
  if (access === 0) return errorCount > 0 ? 100 : 0
  return Math.round((1000 * errorCount) / access) / 10
}

export function buildUsageHeatmapByArea(
  featureRows: UsageHeatmapFeatureBucketRow[],
  errorRows: UsageHeatmapErrorBucketRow[],
  from: Date,
  to: Date,
  granularity: OpsUsageGranularity,
  preset: OpsUsagePreset,
): OpsUsageHeatmap {
  const areaCells = new Map<string, Map<string, OpsUsageHeatmapCell>>()
  const areaErrors = new Map<string, Map<string, number>>()

  for (const row of featureRows) {
    const entry = resolveOpsFeatureEntry(row.featureKey)
    const area = entry.area
    const bk = bucketKey(row.bucketStart)
    const byBucket = areaCells.get(area) ?? new Map<string, OpsUsageHeatmapCell>()
    const cell = byBucket.get(bk) ?? {
      bucketStart: bk,
      sessionCount: 0,
      accountCount: 0,
      eventCount: 0,
      failRatePct: 0,
    }
    cell.sessionCount += row.sessionCount
    cell.accountCount += row.accountCount
    cell.eventCount += row.eventCount
    byBucket.set(bk, cell)
    areaCells.set(area, byBucket)
  }

  for (const row of errorRows) {
    const entry = resolveOpsFeatureEntry(row.feature)
    const area = entry.area
    const bk = bucketKey(row.bucketStart)
    const byBucket = areaErrors.get(area) ?? new Map<string, number>()
    byBucket.set(bk, (byBucket.get(bk) ?? 0) + row.errorCount)
    areaErrors.set(area, byBucket)
  }

  const rows: OpsUsageHeatmapRow[] = []
  for (const [area, cellsMap] of areaCells) {
    const errMap = areaErrors.get(area) ?? new Map<string, number>()
    const cells: OpsUsageHeatmapCell[] = []
    for (const cell of cellsMap.values()) {
      const err = errMap.get(cell.bucketStart) ?? 0
      cells.push({
        ...cell,
        failRatePct: failRate(cell.eventCount, err, cell.accountCount),
      })
    }
    cells.sort((a, b) => a.bucketStart.localeCompare(b.bucketStart))
    rows.push({ area, cells })
  }

  rows.sort((a, b) => {
    const aSum = a.cells.reduce((s, c) => s + c.sessionCount, 0)
    const bSum = b.cells.reduce((s, c) => s + c.sessionCount, 0)
    return bSum - aSum
  })

  return {
    from: from.toISOString(),
    to: to.toISOString(),
    granularity,
    preset,
    rows,
  }
}