import type { OpsMetricsSnapshot } from '../../src/domain/ops/ops-metrics.types.js'
import { emptyOpsMetricsSnapshot } from './ops-metrics.fixture.js'

export interface OpsNotifierScenario {
  id: string
  title: string
  /** Descrição curta para o operador */
  description: string
  buildSnapshot: () => OpsMetricsSnapshot
  /** Passa triagem human_required */
  expectHumanRequired: boolean
  /** Dispara toast com OPS_ALERTS_MIN_SEVERITY=critical (padrão) */
  expectProductionDispatch: boolean
}

function base(): OpsMetricsSnapshot {
  return emptyOpsMetricsSnapshot()
}

export const OPS_NOTIFIER_SCENARIOS: OpsNotifierScenario[] = [
  {
    id: 'sync_stuck_amil',
    title: 'Sync travado (Amil)',
    description: 'Job running > 30 min — pager operador',
    expectHumanRequired: true,
    expectProductionDispatch: true,
    buildSnapshot: () => {
      const s = base()
      s.sync.stuckJobs = [{
        jobId: 'sim-job-amil',
        integrationLinkId: 'sim-link',
        portalType: 'amil',
        minutesRunning: 45,
      }]
      return s
    },
  },
  {
    id: 'sync_fail_rate_critical',
    title: 'Fail rate crítico (Hermes Pardini)',
    description: '≥70% falha 24h — degrada portal + pager',
    expectHumanRequired: true,
    expectProductionDispatch: true,
    buildSnapshot: () => {
      const s = base()
      s.sync.portalStats24h = [{
        portalType: 'hermes_pardini',
        total: 12,
        failed: 10,
        success: 2,
        failRatePct: 83,
      }]
      return s
    },
  },
  {
    id: 'sync_fail_rate_warning',
    title: 'Fail rate moderado (Unimed)',
    description: '40% warning — só console, sem toast',
    expectHumanRequired: false,
    expectProductionDispatch: false,
    buildSnapshot: () => {
      const s = base()
      s.sync.portalStats24h = [{
        portalType: 'unimed_bh',
        total: 5,
        failed: 2,
        success: 3,
        failRatePct: 40,
      }]
      return s
    },
  },
  {
    id: 'llm_cascade',
    title: 'Cascata Ava (LLM)',
    description: '3+ falhas 5 min sem sucesso — Ava lite + pager',
    expectHumanRequired: true,
    expectProductionDispatch: true,
    buildSnapshot: () => {
      const s = base()
      s.productEvents.last5m = { avaChatCompleted: 0, avaChatFailed: 5 }
      return s
    },
  },
  {
    id: 'llm_quota_spike',
    title: 'Pico franquia Ava',
    description: 'Warning produto — modo degradado, sem pager',
    expectHumanRequired: false,
    expectProductionDispatch: false,
    buildSnapshot: () => {
      const s = base()
      s.productEvents.last1h.avaQuotaBlocked = 15
      return s
    },
  },
  {
    id: 'infra_api_down',
    title: 'API health down',
    description: 'Sonda API falhou — leitura D-1 + pager',
    expectHumanRequired: true,
    expectProductionDispatch: true,
    buildSnapshot: () => {
      const s = base()
      s.probe = {
        checkedAt: new Date().toISOString(),
        api: { ok: false, latencyMs: 8000, status: 503, error: 'simulated' },
        postgres: { ok: true, latencyMs: 12 },
        neo4j: { ok: true, latencyMs: 5 },
      }
      return s
    },
  },
  {
    id: 'infra_api_slow',
    title: 'API health lenta',
    description: 'Warning infra — sem pager',
    expectHumanRequired: false,
    expectProductionDispatch: false,
    buildSnapshot: () => {
      const s = base()
      s.probe = {
        checkedAt: new Date().toISOString(),
        api: { ok: true, latencyMs: 4500, status: 200 },
        postgres: { ok: true, latencyMs: 12 },
        neo4j: { ok: true, latencyMs: 5 },
      }
      return s
    },
  },
  {
    id: 'infra_postgres_down',
    title: 'Postgres down',
    description: 'Sonda PG falhou — pager crítico',
    expectHumanRequired: true,
    expectProductionDispatch: true,
    buildSnapshot: () => {
      const s = base()
      s.probe = {
        checkedAt: new Date().toISOString(),
        api: { ok: true, latencyMs: 40, status: 200 },
        postgres: { ok: false, latencyMs: 0, error: 'connection refused (sim)' },
        neo4j: { ok: true, latencyMs: 5 },
      }
      return s
    },
  },
  {
    id: 'infra_neo4j_down',
    title: 'Neo4j down',
    description: 'Warning — associações offline, sem pager',
    expectHumanRequired: false,
    expectProductionDispatch: false,
    buildSnapshot: () => {
      const s = base()
      s.probe = {
        checkedAt: new Date().toISOString(),
        api: { ok: true, latencyMs: 40, status: 200 },
        postgres: { ok: true, latencyMs: 12 },
        neo4j: { ok: false, latencyMs: 0, error: 'simulated' },
      }
      return s
    },
  },
  {
    id: 'multi_critical',
    title: 'Multi-alert crítico',
    description: 'API down + cascata Ava — um toast com 2 linhas',
    expectHumanRequired: true,
    expectProductionDispatch: true,
    buildSnapshot: () => {
      const s = base()
      s.probe = {
        checkedAt: new Date().toISOString(),
        api: { ok: false, latencyMs: 9000, status: 503 },
        postgres: { ok: true, latencyMs: 12 },
        neo4j: { ok: true, latencyMs: 5 },
      }
      s.productEvents.last5m = { avaChatCompleted: 0, avaChatFailed: 4 }
      return s
    },
  },
]

export function findNotifierScenario(id: string): OpsNotifierScenario | undefined {
  return OPS_NOTIFIER_SCENARIOS.find((s) => s.id === id)
}
