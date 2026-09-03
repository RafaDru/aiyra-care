import { createServer } from 'http'
import { execFile } from 'child_process'
import { platform } from 'os'
import { writeFileSync, unlinkSync } from 'fs'
import { dirname, join, resolve } from 'path'
import { tmpdir } from 'os'
import { randomBytes } from 'crypto'
import { fileURLToPath } from 'url'
import { config } from 'dotenv'

/**
 * Receptor local de alertas ops (dev / operador na máquina).
 * POST JSON { text, alerts, toast, dashboardUrl } — OpsAlertDispatchService.
 *
 * Preferir tray no Windows: scripts/ops-local-notifier-tray.ps1
 */
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
config({ path: resolve(root, '.env') })

const PORT = Number(process.env.OPS_LOCAL_NOTIFIER_PORT ?? 3012)
const PATH = process.env.OPS_LOCAL_NOTIFIER_PATH ?? '/ops-alert'
const toastScript = resolve(root, 'scripts/ops-local-toast.ps1')

function resolveObservabilityUrl() {
  const explicit = process.env.OPS_ALERT_DASHBOARD_URL?.trim()
  if (explicit) {
    const url = explicit.replace(/\/$/, '')
    if (/:5173\/ops$/.test(url)) {
      console.warn('[ops-local-notifier] legacy OPS_ALERT_DASHBOARD_URL ignored, using ops-console')
      const consolePort = process.env.OPS_CONSOLE_PORT?.trim() || '3013'
      return `http://127.0.0.1:${consolePort}`
    }
    return url
  }
  const consolePort = process.env.OPS_CONSOLE_PORT?.trim() || '3013'
  return `http://127.0.0.1:${consolePort}`
}

const defaultDashboardUrl = resolveObservabilityUrl()
const openBrowser = process.env.OPS_LOCAL_NOTIFIER_OPEN?.trim() !== '0'

function openUrl(url) {
  if (!openBrowser) {
    console.log(`[ops-local-notifier] open skipped (OPS_LOCAL_NOTIFIER_OPEN=0) -> ${url}`)
    return
  }
  if (platform() === 'win32') {
    execFile('cmd', ['/c', 'start', '', url], { windowsHide: true })
  } else {
    execFile('open', [url])
  }
}

function mapIconType(icon) {
  if (icon === 'error') return 'Error'
  if (icon === 'info') return 'Info'
  return 'Warning'
}

function resolveToast(json) {
  if (json.toast?.title && json.toast?.body) {
    return {
      title: String(json.toast.title),
      body: String(json.toast.body),
      iconType: mapIconType(json.toast.icon),
    }
  }

  const alerts = Array.isArray(json.alerts) ? json.alerts : []
  if (alerts.length > 0) {
    const hasCritical = alerts.some((a) => a.severity === 'critical')
    const primary = alerts.find((a) => a.severity === 'critical') ?? alerts[0]
    const category = String(primary.category ?? 'product')
    let iconType = 'Warning'
    if (hasCritical) iconType = 'Error'
    else if (category === 'product' || primary.id === 'infra_neo4j_down') iconType = 'Info'

    const catLabel = { infra: 'Infra', sync: 'Sync', llm: 'Ava', product: 'Produto' }[category] ?? category
    const severityWord = hasCritical ? 'CRITICO' : 'AVISO'
    const lines = alerts.slice(0, 3).map((a) => {
      const c = { infra: 'Infra', sync: 'Sync', llm: 'Ava', product: 'Produto' }[a.category] ?? a.category
      const msg = String(a.message).replace(/\u2014/g, '-').replace(/\u2022/g, '-')
      return `${c}: ${msg}`
    })
    if (alerts.length > 3) lines.push(`(+${alerts.length - 3} mais)`)
    return {
      title: `AiyraCare Ops | ${severityWord}`,
      body: lines.join('\n'),
      iconType,
    }
  }

  const text = String(json.text ?? 'Alerta ops')
  return { title: 'AiyraCare Ops', body: text.split('\n').slice(0, 3).join('\n'), iconType: 'Warning' }
}

function showToast(title, body, iconType) {
  if (platform() !== 'win32') {
    console.log(`[toast] ${title}: ${body}`)
    return
  }

  const tmp = join(tmpdir(), `ops-toast-${randomBytes(8).toString('hex')}.utf8.txt`)
  writeFileSync(tmp, body, 'utf8')

  execFile(
    'powershell',
    [
      '-NoProfile',
      '-ExecutionPolicy', 'Bypass',
      '-File', toastScript,
      '-Title', title,
      '-BodyFile', tmp,
      '-IconType', iconType,
    ],
    { windowsHide: true },
    (err) => {
      if (err) {
        console.warn('[ops-local-notifier] toast failed', err.message)
        try { unlinkSync(tmp) } catch { /* ignore */ }
      }
    },
  )
}

function readBody(req) {
  return new Promise((resolvePromise, reject) => {
    const chunks = []
    req.on('data', (c) => chunks.push(c))
    req.on('end', () => resolvePromise(Buffer.concat(chunks).toString('utf8')))
    req.on('error', reject)
  })
}

const server = createServer(async (req, res) => {
  const url = req.url?.split('?')[0] ?? ''

  if (req.method === 'GET' && url === '/health') {
    res.writeHead(200, { 'Content-Type': 'text/plain; charset=utf-8' }).end('ok')
    return
  }

  if (req.method === 'POST' && url === PATH) {
    try {
      const raw = await readBody(req)
      const json = raw ? JSON.parse(raw) : {}
      const toast = resolveToast(json)
      const dashboardUrl = json.dashboardUrl ? String(json.dashboardUrl) : defaultDashboardUrl
      const count = Array.isArray(json.alerts) ? json.alerts.length : 0
      console.log(`[ops-local-notifier] ${count} alert(s) [${toast.iconType}] ${toast.title}`)
      console.log(`[ops-local-notifier] ${toast.body.replace(/\n/g, ' | ')}`)
      console.log(`[ops-local-notifier] dashboard -> ${dashboardUrl}`)
      showToast(toast.title, toast.body, toast.iconType)
      openUrl(dashboardUrl)
      res.writeHead(200, { 'Content-Type': 'text/plain; charset=utf-8' }).end('ok')
    } catch (err) {
      console.error('[ops-local-notifier] bad payload', err)
      res.writeHead(400).end('bad json')
    }
    return
  }

  res.writeHead(404).end('not found')
})

server.listen(PORT, '127.0.0.1', () => {
  console.log(`ops-local-notifier listening http://127.0.0.1:${PORT}${PATH}`)
  console.log(`ops-local-notifier dashboard default ${defaultDashboardUrl}`)
})
