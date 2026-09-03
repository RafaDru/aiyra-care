import { describe, expect, it } from 'vitest'
import { evaluateOpsAlerts } from '../src/domain/ops/ops-alerts.js'
import {
  filterAlertsForDispatch,
  triageOpsAlerts,
} from '../src/domain/ops/ops-alert-triage.js'
import { buildOpsAlertDispatchPayload } from '../src/application/ops/ops-alert-dispatch.service.js'
import {
  OPS_NOTIFIER_SCENARIOS,
  findNotifierScenario,
} from './fixtures/ops-notifier-scenarios.js'

function severityRank(s: 'warning' | 'critical'): number {
  return s === 'critical' ? 2 : 1
}

/** Réplica do filtro de OpsAlertDispatchService (produção padrão). */
function productionDispatchAlerts(alerts: ReturnType<typeof evaluateOpsAlerts>) {
  const min = process.env.OPS_ALERTS_MIN_SEVERITY?.trim() === 'warning' ? 'warning' : 'critical'
  const severityFiltered = alerts.filter(
    (a) => severityRank(a.severity) >= severityRank(min),
  )
  return filterAlertsForDispatch(severityFiltered, 'human_required')
}

describe('ops notifier scenarios — triagem e payload', () => {
  for (const scenario of OPS_NOTIFIER_SCENARIOS) {
    it(`${scenario.id}: humanRequired=${scenario.expectHumanRequired} dispatch=${scenario.expectProductionDispatch}`, () => {
      const snapshot = scenario.buildSnapshot()
      const alerts = evaluateOpsAlerts(snapshot)
      expect(alerts.length).toBeGreaterThan(0)

      const triage = triageOpsAlerts(alerts)
      const humanCount = triage.filter((t) => t.humanRequired).length
      const toDispatch = productionDispatchAlerts(alerts)

      if (scenario.expectHumanRequired) {
        expect(humanCount).toBeGreaterThan(0)
      } else {
        expect(humanCount).toBe(0)
      }

      if (scenario.expectProductionDispatch) {
        expect(toDispatch.length).toBeGreaterThan(0)
      } else {
        expect(toDispatch).toHaveLength(0)
      }

      const payload = buildOpsAlertDispatchPayload(
        toDispatch.length ? toDispatch : alerts,
        new Date().toISOString(),
        triage,
      )
      expect(payload.text).toContain('AiyraCare Ops')
      expect(payload.dashboardUrl).toMatch(/3013/)
      if (toDispatch.length) {
        expect(payload.alerts.length).toBe(toDispatch.length)
      }
    })
  }

  it('findNotifierScenario resolves ids', () => {
    expect(findNotifierScenario('llm_cascade')?.title).toContain('Cascata')
    expect(findNotifierScenario('missing')).toBeUndefined()
  })
})
