/**
 * Bateria de simulação — POST ao notificador local (:3012) com payloads realistas.
 *
 * Uso:
 *   npm run ops:notifier:simulate              # só cenários que disparam toast em produção
 *   npm run ops:notifier:simulate -- --all     # inclui warnings (sem pager real)
 *   npm run ops:notifier:simulate -- --scenario=llm_cascade
 *   OPS_LOCAL_NOTIFIER_OPEN=0 ...              # toast sem abrir browser (no notifier)
 */
import { config } from 'dotenv'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'
import { evaluateOpsAlerts } from '../src/domain/ops/ops-alerts.js'
import {
  filterAlertsForDispatch,
  triageOpsAlerts,
} from '../src/domain/ops/ops-alert-triage.js'
import {
  buildOpsAlertDispatchPayload,
} from '../src/application/ops/ops-alert-dispatch.service.js'
import {
  OPS_NOTIFIER_SCENARIOS,
  findNotifierScenario,
} from '../tests/fixtures/ops-notifier-scenarios.js'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../../..')
config({ path: resolve(root, '.env') })

const notifierPort = process.env.OPS_LOCAL_NOTIFIER_PORT?.trim() || '3012'
const notifierPath = process.env.OPS_LOCAL_NOTIFIER_PATH?.trim() || '/ops-alert'
const webhook = process.env.OPS_ALERT_WEBHOOK_URL?.trim()
  || `http://127.0.0.1:${notifierPort}${notifierPath}`

const args = process.argv.slice(2)
const allScenarios = args.includes('--all')
const dryRun = args.includes('--dry-run')
const scenarioArg = args.find((a) => a.startsWith('--scenario='))
const scenarioId = scenarioArg?.split('=')[1]
const delayArg = args.find((a) => a.startsWith('--delay='))
const delayMs = Number(delayArg?.split('=')[1] ?? '4500')

function severityRank(s: 'warning' | 'critical'): number {
  return s === 'critical' ? 2 : 1
}

function productionDispatchAlerts(alerts: ReturnType<typeof evaluateOpsAlerts>) {
  const min = process.env.OPS_ALERTS_MIN_SEVERITY?.trim() === 'warning' ? 'warning' : 'critical'
  const severityFiltered = alerts.filter(
    (a) => severityRank(a.severity) >= severityRank(min),
  )
  return filterAlertsForDispatch(severityFiltered, 'human_required')
}

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms))
}

interface RunResult {
  id: string
  title: string
  sent: boolean
  skipped: boolean
  reason?: string
  status?: number
  alertIds: string[]
}

async function checkNotifierHealth(): Promise<boolean> {
  const healthUrl = webhook.replace(/\/ops-alert.*$/, '/health')
    .replace(/\/$/, '')
  const base = `http://127.0.0.1:${notifierPort}/health`
  const url = healthUrl.includes('/health') ? healthUrl : base
  try {
    const res = await fetch(url)
    return res.ok
  } catch {
    return false
  }
}

async function postPayload(payload: unknown): Promise<{ ok: boolean; status: number }> {
  const res = await fetch(webhook, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  return { ok: res.ok, status: res.status }
}

async function runScenario(scenario: typeof OPS_NOTIFIER_SCENARIOS[number]): Promise<RunResult> {
  const snapshot = scenario.buildSnapshot()
  const alerts = evaluateOpsAlerts(snapshot)
  const triage = triageOpsAlerts(alerts)
  const toDispatch = productionDispatchAlerts(alerts)

  const shouldSend = allScenarios
    ? alerts.length > 0
    : scenario.expectProductionDispatch && toDispatch.length > 0

  if (!shouldSend) {
    return {
      id: scenario.id,
      title: scenario.title,
      sent: false,
      skipped: true,
      reason: allScenarios ? 'sem alertas' : 'não dispara em produção (human_required + critical)',
      alertIds: alerts.map((a) => a.id),
    }
  }

  const payloadAlerts = allScenarios && toDispatch.length === 0 ? alerts : toDispatch
  const payload = buildOpsAlertDispatchPayload(
    payloadAlerts,
    new Date().toISOString(),
    triage,
  )
  payload.text = `[SIM] ${scenario.title}\n${payload.text}`
  if (payload.toast) {
    payload.toast = {
      ...payload.toast,
      title: `[SIM] ${payload.toast.title}`,
    }
  }

  if (dryRun) {
    console.log(`[dry-run] ${scenario.id}: ${payloadAlerts.map((a) => a.id).join(', ')}`)
    return {
      id: scenario.id,
      title: scenario.title,
      sent: false,
      skipped: false,
      reason: 'dry-run',
      alertIds: payloadAlerts.map((a) => a.id),
    }
  }

  const { ok, status } = await postPayload(payload)
  return {
    id: scenario.id,
    title: scenario.title,
    sent: ok,
    skipped: false,
    status,
    alertIds: payloadAlerts.map((a) => a.id),
  }
}

async function main() {
  console.log('AiyraCare — bateria notificações locais')
  console.log(`Webhook: ${webhook}`)
  console.log(`Modo: ${allScenarios ? 'todos alertas' : 'produção (critical + human_required)'}`)
  console.log(`Delay entre toasts: ${delayMs}ms`)
  if (dryRun) console.log('DRY-RUN — sem POST')
  console.log('')

  if (!dryRun) {
    const healthy = await checkNotifierHealth()
    if (!healthy) {
      console.error(`Notificador indisponível em :${notifierPort}. Rode: npm run ops:notifier:up`)
      process.exit(1)
    }
    console.log(`[OK] notificador :${notifierPort}/health`)
  }

  let scenarios = OPS_NOTIFIER_SCENARIOS
  if (scenarioId) {
    const one = findNotifierScenario(scenarioId)
    if (!one) {
      console.error(`Cenário desconhecido: ${scenarioId}`)
      console.error(`Ids: ${OPS_NOTIFIER_SCENARIOS.map((s) => s.id).join(', ')}`)
      process.exit(1)
    }
    scenarios = [one]
  }

  const results: RunResult[] = []

  for (let i = 0; i < scenarios.length; i++) {
    const scenario = scenarios[i]
    console.log(`— ${scenario.title} (${scenario.id})`)
    const result = await runScenario(scenario)
    results.push(result)

    if (result.skipped) {
      console.log(`  skip: ${result.reason} [${result.alertIds.join(', ')}]`)
    } else if (result.reason === 'dry-run') {
      console.log(`  dry-run ok [${result.alertIds.join(', ')}]`)
    } else if (result.sent) {
      console.log(`  POST ok HTTP ${result.status} [${result.alertIds.join(', ')}]`)
    } else {
      console.log(`  FAIL HTTP ${result.status ?? '?'} [${result.alertIds.join(', ')}]`)
    }

    if (i < scenarios.length - 1 && !dryRun && result.sent) {
      await sleep(delayMs)
    }
  }

  const sent = results.filter((r) => r.sent).length
  const skipped = results.filter((r) => r.skipped).length
  const failed = results.filter((r) => !r.sent && !r.skipped && r.reason !== 'dry-run').length

  console.log('')
  console.log(`Resumo: ${sent} toast(s), ${skipped} skip, ${failed} falha(s)`)

  if (failed > 0) process.exit(1)
  if (dryRun) return
  if (sent === 0 && !allScenarios) {
    console.log('[hint] Use --all para simular warnings também')
  }
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
