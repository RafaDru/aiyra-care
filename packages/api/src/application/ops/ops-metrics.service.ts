import type { LlmInternalCostService } from '../llm/llm-internal-cost.service.js'
import { evaluateOpsAlerts } from '../../domain/ops/ops-alerts.js'
import {
  getOpsFeatureCatalog,
  resolveFeatureKeyFromProductEvent,
} from '../../domain/ops/ops-feature-catalog.js'
import { buildFeatureHealthMatrix } from '../../domain/ops/ops-feature-health.js'
import { buildTimeSeries24h } from '../../domain/ops/ops-time-series.js'
import type { OpsAlert, OpsMetricsSnapshot } from '../../domain/ops/ops-metrics.types.js'
import type { OpsMetricsPgRepository } from '../../infrastructure/persistence/ops-metrics.pg.repository.js'
import { readOpsProbeArtifact, writeOpsMetricsArtifact } from './ops-probe-artifact.js'

export interface OpsMetricsResponse {
  metrics: OpsMetricsSnapshot
  alerts: OpsAlert[]
}

export class OpsMetricsService {
  constructor(
    private readonly repo: OpsMetricsPgRepository,
    private readonly internalCost?: LlmInternalCostService,
  ) {}

  async getMetrics(): Promise<OpsMetricsResponse> {
    const [
      ava24h,
      ava7d,
      providerMix24h,
      portalStats24h,
      stuckJobs,
      recentFailures,
      product1h,
      product5m,
      errorFingerprints24h,
      clientErrorFingerprints24h,
      productEventUsage24h,
      clientErrorFeatureCounts24h,
      syncJobsHourly24h,
      avaEventsHourly24h,
      clientErrorsHourly24h,
      avaTokensHourly24h,
      workerLastTickAt,
      stripeWebhookRejected1h,
      supportOpenCount,
      supportSubmitted24h,
    ] = await Promise.all([
      this.repo.avaTokenPercentiles(24),
      this.repo.avaTokenPercentiles(24 * 7),
      this.repo.avaProviderMix(24),
      this.repo.syncPortalStats24h(),
      this.repo.syncStuckJobs(),
      this.repo.syncRecentFailures(10),
      this.repo.productEventCountsSinceHours(1),
      this.repo.productEventCountsSinceMinutes(5),
      this.repo.errorFingerprints24h(25),
      this.repo.clientErrorFingerprints24h(30),
      this.repo.productEventUsage24h(),
      this.repo.clientErrorFeatureCounts24h(),
      this.repo.syncJobsHourly24h(),
      this.repo.avaEventsHourly24h(),
      this.repo.clientErrorsHourly24h(),
      this.repo.avaTokensHourly24h(),
      this.repo.opsWorkerLastTickAt(),
      this.repo.stripeWebhookRejectedCount1h(),
      this.repo.supportReportsOpenCount(),
      this.repo.supportReportsSubmitted24h(),
    ])

    const featureHealth24h = buildFeatureHealthMatrix(
      productEventUsage24h,
      clientErrorFeatureCounts24h,
      resolveFeatureKeyFromProductEvent,
    )

    let internalLlm: OpsMetricsSnapshot['internalLlm'] | undefined
    if (this.internalCost) {
      const indicators = await this.internalCost.getIndicators()
      internalLlm = {
        calls: indicators.calls,
        llmResolved: indicators.llmResolved,
        localFallback: indicators.localFallback,
        budgetExhausted: indicators.budgetExhausted,
        totalCostUsdCents: indicators.totalCostUsdCents,
        monthlyBudgetBrlCents: indicators.monthlyBudgetBrlCents,
        spentBrlCents: indicators.spentBrlCents,
        remainingBrlCents: indicators.remainingBrlCents,
        exhausted: indicators.exhausted,
      }
    }

    const workerStaleMinutes = workerLastTickAt
      ? Math.max(0, (Date.now() - new Date(workerLastTickAt).getTime()) / 60_000)
      : null

    const metrics: OpsMetricsSnapshot = {
      generatedAt: new Date().toISOString(),
      ava: {
        last24h: ava24h,
        last7d: ava7d,
        providerMix24h: providerMix24h,
      },
      sync: {
        portalStats24h,
        stuckJobs,
        recentFailures,
      },
      productEvents: {
        last1h: product1h,
        last5m: {
          avaChatCompleted: product5m.avaChatCompleted,
          avaChatFailed: product5m.avaChatFailed,
        },
      },
      internalLlm,
      errorFingerprints24h,
      clientErrorFingerprints24h,
      featureHealth24h,
      featureCatalog: getOpsFeatureCatalog(),
      timeSeries24h: buildTimeSeries24h(
        syncJobsHourly24h,
        avaEventsHourly24h,
        clientErrorsHourly24h,
        avaTokensHourly24h,
      ),
      probe: readOpsProbeArtifact() ?? undefined,
      ops: {
        workerLastTickAt,
        workerStaleMinutes,
        stripeWebhookRejected1h,
      },
      supportReports: {
        openCount: supportOpenCount,
        submitted24h: supportSubmitted24h,
      },
    }

    return { metrics, alerts: evaluateOpsAlerts(metrics) }
  }
}
