import { buildUsageHeatmapByArea } from '../../domain/ops/ops-usage-heatmap.js'
import { resolveUsageRange } from '../../domain/ops/ops-usage-range.js'
import type {
  OpsUsageLiveSnapshot,
  OpsUsageResponse,
} from '../../domain/ops/ops-usage.types.js'
import type { OpsMetricsPgRepository } from '../../infrastructure/persistence/ops-metrics.pg.repository.js'

const LIVE_WINDOW_MINUTES = 15

export class OpsUsageService {
  constructor(private readonly repo: OpsMetricsPgRepository) {}

  async getLiveSnapshot(windowMinutes = LIVE_WINDOW_MINUTES): Promise<OpsUsageLiveSnapshot> {
    const [counts, bySurface, eventsPerMinuteLastHour] = await Promise.all([
      this.repo.usageActiveCounts(windowMinutes),
      this.repo.usageBySurface(windowMinutes),
      this.repo.usageEventsPerMinuteLastHour(),
    ])
    return {
      generatedAt: new Date().toISOString(),
      windowMinutes,
      activeAccounts: counts.activeAccounts,
      activeSessions: counts.activeSessions,
      anonymousSessions: counts.anonymousSessions,
      bySurface,
      eventsPerMinuteLastHour: eventsPerMinuteLastHour,
    }
  }

  async getUsage(
    presetRaw: string | undefined,
    fromRaw?: string,
    toRaw?: string,
    opts?: { includeSeries?: boolean; includeHeatmap?: boolean },
  ): Promise<OpsUsageResponse> {
    const range = resolveUsageRange(presetRaw, fromRaw, toRaw)
    const live = await this.getLiveSnapshot()

    const response: OpsUsageResponse = { live }

    if (opts?.includeSeries !== false) {
      const series = await this.repo.usageTimeSeries(range.from, range.to, range.granularity)
      response.series = {
        from: range.from.toISOString(),
        to: range.to.toISOString(),
        granularity: range.granularity,
        preset: range.preset,
        series,
      }
    }

    if (opts?.includeHeatmap !== false) {
      const heatmapGranularity = range.granularity === '15m' ? '1h' : range.granularity
      const [featureRows, errorRows] = await Promise.all([
        this.repo.usageHeatmapFeatureBuckets(range.from, range.to, heatmapGranularity),
        this.repo.usageHeatmapErrorBuckets(range.from, range.to, heatmapGranularity),
      ])
      response.heatmap = buildUsageHeatmapByArea(
        featureRows,
        errorRows,
        range.from,
        range.to,
        heatmapGranularity,
        range.preset,
      )
    }

    return response
  }
}