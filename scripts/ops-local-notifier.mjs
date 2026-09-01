/**
 * Receptor local de alertas ops (dev / operador na máquina).
 * POST JSON { text, alerts, dashboardUrl } — mesmo contrato que OpsAlertDispatchService.
 *
 * Preferir tray no Windows: scripts/ops-local-notifier-tray.ps1
 * Uso headless: node scripts/ops-local-notifier.mjs
 */
import { createServer } from 'http'
import { execFile } from 'child_process'
import { platform } from 'os'
import { dirname, resolve } from 'path'
import { fileURLToPath } from 'url'
import { config } from 'dotenv'

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

function openUrl(url) {
  if (platform() === 'win32') {
    execFile('cmd', ['/c', 'start', '', url], { windowsHide: true })
  } else {
    execFile('open', [url])
  }
}

function showToast(title, body) {
  if (platform() !== 'win32') {
    console.log(`[toast] ${title}: ${body}`)
    return
  }
  execFile(
    'powershell',
    ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', toastScript, '-Title', title, '-Body', body],
    { windowsHide: true },
    (err) => {
      if (err) console.warn('[ops-local-notifier] toast failed', err.message)
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
    res.writeHead(200, { 'Content-Type': 'text/plain' }).end('ok')
    return
  }

  if (req.method === 'POST' && url === PATH) {
    try {
      const raw = await readBody(req)
      const json = raw ? JSON.parse(raw) : {}
      const text = String(json.text ?? 'Alerta ops')
      const line = text.split('\n').find((l) => l.trim().startsWith('•')) ?? text.split('\n')[0]
      const dashboardUrl = json.dashboardUrl ? String(json.dashboardUrl) : defaultDashboardUrl
      const count = Array.isArray(json.alerts) ? json.alerts.length : 0
      console.log(`[ops-local-notifier] ${count} alert(s) — ${line}`)
      console.log(`[ops-local-notifier] dashboard -> ${dashboardUrl}`)
      showToast('AiyraCare Ops', line.slice(0, 240))
      openUrl(dashboardUrl)
      res.writeHead(200, { 'Content-Type': 'text/plain' }).end('ok')
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
