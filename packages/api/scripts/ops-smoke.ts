/**
 * Smoke HTTP: API ops + (opcional) console :3013 + notificador :3012.
 *
 * Uso:
 *   npm run ops:smoke              # API + /ops/* (requer OPS_METRICS_KEY)
 *   OPS_SMOKE_FULL=1 npm run ops:smoke   # inclui console e notificador local
 */
import { config } from 'dotenv'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../../..')
config({ path: resolve(root, '.env') })

const apiBase = (process.env.API_PUBLIC_URL ?? 'http://127.0.0.1:3010').replace(/\/$/, '')
const consoleHost = process.env.OPS_CONSOLE_HOST?.trim() || '127.0.0.1'
const consolePort = process.env.OPS_CONSOLE_PORT?.trim() || '3013'
const consoleBase = `http://${consoleHost}:${consolePort}`
const notifierPort = process.env.OPS_LOCAL_NOTIFIER_PORT?.trim() || '3012'
const notifierPath = process.env.OPS_LOCAL_NOTIFIER_PATH?.trim() || '/ops-alert'
const notifierBase = `http://127.0.0.1:${notifierPort}`
const key = process.env.OPS_METRICS_KEY?.trim() || process.env.LLM_INTERNAL_OBSERVABILITY_KEY?.trim()
const fullStack = process.env.OPS_SMOKE_FULL === '1' || process.env.OPS_SMOKE_FULL === 'true'

interface CheckResult {
  name: string
  ok: boolean
  detail: string
}

const results: CheckResult[] = []

async function fetchStatus(url: string, headers: Record<string, string> = {}) {
  const res = await fetch(url, { headers })
  const text = await res.text()
  let json: unknown
  try {
    json = JSON.parse(text)
  } catch {
    json = text
  }
  return { status: res.status, json, text }
}

function record(name: string, ok: boolean, detail: string) {
  results.push({ name, ok, detail })
  const mark = ok ? 'OK' : 'FAIL'
  console.log(`[${mark}] ${name} — ${detail}`)
}

async function checkApiHealth() {
  const health = await fetchStatus(`${apiBase}/health`)
  record('API /health', health.status === 200, `status ${health.status}`)
}

async function checkOpsMetrics() {
  const opsHeaders: Record<string, string> = {}
  if (key) opsHeaders['x-internal-ops-key'] = key
  else {
    record('OPS_METRICS_KEY', false, 'não definido — defina via setup:ops-alerts')
    return
  }

  const metrics = await fetchStatus(`${apiBase}/ops/metrics`, opsHeaders)
  if (metrics.status !== 200) {
    record('GET /ops/metrics', false, `status ${metrics.status}`)
    return
  }

  const body = metrics.json as {
    metrics?: {
      generatedAt?: string
      featureHealth24h?: unknown[]
      timeSeries24h?: Record<string, unknown[]>
      probe?: unknown
    }
    alerts?: unknown[]
  }
  const shapeOk = Boolean(
    body.metrics?.generatedAt
    && Array.isArray(body.metrics.featureHealth24h)
    && body.metrics.timeSeries24h
    && Array.isArray(body.alerts),
  )
  record(
    'GET /ops/metrics',
    shapeOk,
    `alerts=${body.alerts?.length ?? 0} features=${body.metrics?.featureHealth24h?.length ?? 0} probe=${body.metrics?.probe ? 'yes' : 'no'}`,
  )

  const alerts = await fetchStatus(`${apiBase}/ops/alerts`, opsHeaders)
  record('GET /ops/alerts', alerts.status === 200, `status ${alerts.status}`)
}

async function checkOpsConsole() {
  const health = await fetchStatus(`${consoleBase}/health`)
  const ok = health.status === 200
  const service = ok && typeof health.json === 'object' && health.json
    ? (health.json as { service?: string }).service
    : undefined
  record('Ops console /health', ok, ok ? `${consoleBase} (${service ?? 'ok'})` : `status ${health.status}`)

  if (!ok) return

  const metrics = await fetchStatus(`${consoleBase}/api/metrics`)
  const body = metrics.json as { metrics?: { timeSeries24h?: unknown }; alerts?: unknown[] } | undefined
  const shapeOk = metrics.status === 200
    && body?.metrics?.timeSeries24h != null
    && Array.isArray(body.alerts)
  record(
    'Ops console /api/metrics',
    shapeOk,
    shapeOk ? `alerts=${body?.alerts?.length ?? 0}` : `status ${metrics.status}`,
  )
}

async function checkLocalNotifier() {
  const health = await fetchStatus(`${notifierBase}/health`)
  record('Local notifier /health', health.status === 200, `${notifierBase}/health`)

  if (health.status !== 200) return

  if (process.env.OPS_SMOKE_NOTIFIER_PING !== '1') {
    console.log('[skip] notifier POST ping (set OPS_SMOKE_NOTIFIER_PING=1 to test toast)')
    return
  }

  const res = await fetch(`${notifierBase}${notifierPath}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      text: 'AiyraCare ops — 1 alerta(s)\n• [critical] sync: Smoke test [automated]',
      alerts: [{ id: 'ops_smoke_ping', severity: 'critical', category: 'sync', message: 'Smoke test' }],
      checkedAt: new Date().toISOString(),
      dashboardUrl: consoleBase,
    }),
  })
  record('Local notifier POST', res.ok, res.ok ? 'toast simulado enviado' : `HTTP ${res.status}`)
}

async function smokeSkipHttp() {
  const { evaluateOpsAlerts } = await import('../src/domain/ops/ops-alerts.js')
  const { buildOpsAlertDispatchPayload } = await import('../src/application/ops/ops-alert-dispatch.service.js')
  const { emptyOpsMetricsSnapshot } = await import('../tests/fixtures/ops-metrics.fixture.js')
  const snapshot = emptyOpsMetricsSnapshot()
  const alerts = evaluateOpsAlerts(snapshot)
  record('evaluateOpsAlerts', Array.isArray(alerts), `alerts=${alerts.length}`)
  const payload = buildOpsAlertDispatchPayload(
    alerts.length
      ? alerts
      : [{ id: 'smoke', severity: 'warning', category: 'product', message: 'smoke' }],
    new Date().toISOString(),
  )
  record(
    'dispatch payload',
    Boolean(payload.text && payload.toast),
    payload.toast ? `icon=${payload.toast.icon}` : 'no toast',
  )
  const key = process.env.OPS_METRICS_KEY?.trim()
  if (key) record('OPS_METRICS_KEY', true, 'defined')
  else console.log('[skip] OPS_METRICS_KEY unset (normal in CI without .env)')
}

async function main() {
  const skipHttp = process.env.OPS_SMOKE_SKIP_HTTP === '1' || process.env.OPS_SMOKE_SKIP_HTTP === 'true'
  if (skipHttp) {
    console.log('AiyraCare ops smoke — modo CI (sem HTTP)')
    await smokeSkipHttp()
    const failed = results.filter((r) => !r.ok)
    if (failed.length) process.exit(1)
    console.log('All ops smoke checks passed (skip HTTP)')
    return
  }

  console.log(`API: ${apiBase}`)
  console.log(`Console: ${consoleBase}`)
  console.log(`Notifier: ${notifierBase}${notifierPath}`)
  console.log(`Full stack checks: ${fullStack}`)
  console.log('')

  await checkApiHealth()
  await checkOpsMetrics()

  if (fullStack) {
    await checkOpsConsole()
    await checkLocalNotifier()
  } else {
    console.log('[hint] OPS_SMOKE_FULL=1 para validar console :3013 e notificador :3012')
  }

  const failed = results.filter((r) => !r.ok)
  if (failed.length) {
    console.error('')
    console.error(`${failed.length} check(s) failed`)
    process.exit(1)
  }
  console.log('')
  console.log('All ops smoke checks passed')
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
