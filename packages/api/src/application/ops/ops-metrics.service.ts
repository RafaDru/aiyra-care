import type { LlmInternalCostService } from '../llm/llm-internal-cost.service.js'
import { evaluateOpsAlerts } from '../../domain/ops/ops-alerts.js'
import type { OpsAlert, OpsMetricsSnapshot } from '../../domain/ops/ops-metrics.types.js'
import type { OpsMetricsPgRepository } from '../../infrastructure/persistence/ops-metrics.pg.repository.js'

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
    ] = await Promise.all([
      this.repo.avaTokenPercentiles(24),
      this.repo.avaTokenPercentiles(24 * 7),
      this.repo.avaProviderMix(24),
      this.repo.syncPortalStats24h(),
      this.repo.syncStuckJobs(),
      this.repo.syncRecentFailures(10),
      this.repo.productEventCountsSinceHours(1),
      this.repo.productEventCountsSinceMinutes(5),
    ])

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
    }

    return { metrics, alerts: evaluateOpsAlerts(metrics) }
  }
}
