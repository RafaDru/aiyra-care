import type { OpsAlert, OpsMetricsSnapshot } from './ops-metrics.types.js'

const SYNC_FAIL_RATE_WARN_PCT = 40
const SYNC_FAIL_MIN_SAMPLE = 3
const SYNC_STUCK_MINUTES = 30
const LLM_CASCADE_WINDOW_MIN = 5
const LLM_CASCADE_MIN_FAILURES = 3
const QUOTA_SPIKE_1H = 10
const API_PROBE_SLOW_MS = Number(process.env.OPS_PROBE_API_SLOW_MS ?? '3000')
const PG_PROBE_SLOW_MS = Number(process.env.OPS_PROBE_PG_SLOW_MS ?? '500')

export function evaluateOpsAlerts(snapshot: OpsMetricsSnapshot): OpsAlert[] {
  const alerts: OpsAlert[] = []

  const probe = snapshot.probe
  if (probe) {
    if (!probe.api.ok) {
      alerts.push({
        id: 'infra_api_down',
        severity: 'critical',
        category: 'infra',
        message: `API health falhou (${probe.api.status ?? 'no response'})`,
        details: { latencyMs: probe.api.latencyMs, error: probe.api.error, checkedAt: probe.checkedAt },
      })
    } else if (probe.api.latencyMs >= API_PROBE_SLOW_MS) {
      alerts.push({
        id: 'infra_api_slow',
        severity: 'warning',
        category: 'infra',
        message: `API health lenta: ${probe.api.latencyMs}ms`,
        details: { latencyMs: probe.api.latencyMs, thresholdMs: API_PROBE_SLOW_MS },
      })
    }
    if (!probe.postgres.ok) {
      alerts.push({
        id: 'infra_postgres_down',
        severity: 'critical',
        category: 'infra',
        message: 'Postgres indisponível na sonda',
        details: { error: probe.postgres.error, latencyMs: probe.postgres.latencyMs },
      })
    } else if (probe.postgres.latencyMs >= PG_PROBE_SLOW_MS) {
      alerts.push({
        id: 'infra_postgres_slow',
        severity: 'warning',
        category: 'infra',
        message: `Postgres lento na sonda: ${probe.postgres.latencyMs}ms`,
        details: { latencyMs: probe.postgres.latencyMs, thresholdMs: PG_PROBE_SLOW_MS },
      })
    }
    if (probe.neo4j && !probe.neo4j.ok) {
      alerts.push({
        id: 'infra_neo4j_down',
        severity: 'warning',
        category: 'infra',
        message: 'Neo4j indisponível na sonda',
        details: { error: probe.neo4j.error, latencyMs: probe.neo4j.latencyMs },
      })
    }
  }

  for (const job of snapshot.sync.stuckJobs) {
    if (job.minutesRunning >= SYNC_STUCK_MINUTES) {
      alerts.push({
        id: `sync_stuck_${job.jobId}`,
        severity: 'critical',
        category: 'sync',
        message: `Sync travado (${job.portalType}) há ${Math.round(job.minutesRunning)} min`,
        details: {
          jobId: job.jobId,
          integrationLinkId: job.integrationLinkId,
          portalType: job.portalType,
          minutesRunning: job.minutesRunning,
        },
      })
    }
  }

  for (const row of snapshot.sync.portalStats24h) {
    if (row.total >= SYNC_FAIL_MIN_SAMPLE && row.failRatePct >= SYNC_FAIL_RATE_WARN_PCT) {
      alerts.push({
        id: `sync_fail_rate_${row.portalType}`,
        severity: row.failRatePct >= 70 ? 'critical' : 'warning',
        category: 'sync',
        message: `Sync ${row.portalType}: ${row.failRatePct}% falha (24h, n=${row.total})`,
        details: {
          portalType: row.portalType,
          failed: row.failed,
          total: row.total,
          failRatePct: row.failRatePct,
        },
      })
    }
  }

  const cascadeFailures = snapshot.productEvents.last5m.avaChatFailed
  const cascadeSuccesses = snapshot.productEvents.last5m.avaChatCompleted
  if (
    cascadeFailures >= LLM_CASCADE_MIN_FAILURES
    && cascadeSuccesses === 0
  ) {
    alerts.push({
      id: 'llm_cascade_fail',
      severity: 'critical',
      category: 'llm',
      message: `Ava: ${cascadeFailures} falhas em ${LLM_CASCADE_WINDOW_MIN} min sem sucesso`,
      details: {
        windowMinutes: LLM_CASCADE_WINDOW_MIN,
        failures: cascadeFailures,
        successes: cascadeSuccesses,
      },
    })
  }

  if (snapshot.productEvents.last1h.avaQuotaBlocked >= QUOTA_SPIKE_1H) {
    alerts.push({
      id: 'llm_quota_spike',
      severity: 'warning',
      category: 'product',
      message: `${snapshot.productEvents.last1h.avaQuotaBlocked} bloqueios de franquia Ava (1h)`,
      details: { count: snapshot.productEvents.last1h.avaQuotaBlocked },
    })
  }

  if (snapshot.internalLlm?.exhausted) {
    alerts.push({
      id: 'internal_llm_budget_exhausted',
      severity: 'warning',
      category: 'llm',
      message: 'Orçamento interno LLM esgotado no mês',
      details: {
        spentBrlCents: snapshot.internalLlm.spentBrlCents,
        monthlyBudgetBrlCents: snapshot.internalLlm.monthlyBudgetBrlCents,
      },
    })
  }

  return alerts
}
