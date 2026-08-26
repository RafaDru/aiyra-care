/**
 * Smoke HTTP: health + GET /ops/metrics e /ops/alerts com x-internal-ops-key.
 * Uso: npm run ops:smoke
 */
import { config } from 'dotenv'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../../..')
config({ path: resolve(root, '.env') })

const base = (process.env.API_PUBLIC_URL ?? 'http://127.0.0.1:3010').replace(/\/$/, '')
const key = process.env.OPS_METRICS_KEY?.trim() || process.env.LLM_INTERNAL_OBSERVABILITY_KEY?.trim()

async function fetchJson(path: string, headers: Record<string, string> = {}) {
  const res = await fetch(`${base}${path}`, { headers })
  const body = await res.text()
  let json: unknown
  try {
    json = JSON.parse(body)
  } catch {
    json = body
  }
  return { status: res.status, json }
}

async function main() {
  console.log(`API base: ${base}`)
  const health = await fetchJson('/health')
  console.log('GET /health', health.status, JSON.stringify(health.json))

  const opsHeaders: Record<string, string> = {}
  if (key) opsHeaders['x-internal-ops-key'] = key
  else console.warn('OPS_METRICS_KEY não definido — /ops/* exige JWT de usuário')

  const metrics = await fetchJson('/ops/metrics', opsHeaders)
  console.log('GET /ops/metrics', metrics.status)
  if (metrics.status === 200 && typeof metrics.json === 'object' && metrics.json) {
    const m = metrics.json as { alerts?: unknown[]; metrics?: { generatedAt?: string } }
    console.log(`  generatedAt=${m.metrics?.generatedAt} alerts=${m.alerts?.length ?? 0}`)
  } else {
    console.log('  body:', JSON.stringify(metrics.json))
  }

  const alerts = await fetchJson('/ops/alerts', opsHeaders)
  console.log('GET /ops/alerts', alerts.status)
  if (alerts.status === 200 && typeof alerts.json === 'object' && alerts.json) {
    const a = alerts.json as { alerts?: unknown[]; errorFingerprints24h?: unknown[] }
    console.log(`  alerts=${a.alerts?.length ?? 0} fingerprints=${a.errorFingerprints24h?.length ?? 0}`)
  } else {
    console.log('  body:', JSON.stringify(alerts.json))
  }

  if (!key) {
    console.log('')
    console.log('Defina OPS_METRICS_KEY (scripts/setup-ops-alerts.ps1) para smoke sem JWT.')
    process.exit(1)
  }
  if (health.status !== 200 || metrics.status !== 200 || alerts.status !== 200) {
    process.exit(1)
  }
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
