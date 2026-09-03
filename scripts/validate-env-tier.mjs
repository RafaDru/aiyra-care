/**
 * Valida alinhamento DEPLOYMENT_TIER ↔ flags ops/worker no .env.
 * Uso: npm run validate:env-tier
 */
import { readFileSync, existsSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const envPath = resolve(root, '.env')

function parseEnvFile(path) {
  const out = {}
  if (!existsSync(path)) return out
  for (const line of readFileSync(path, 'utf8').split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)=(.*)$/)
    if (m) out[m[1]] = m[2].trim()
  }
  return out
}

const fileEnv = parseEnvFile(envPath)
const env = (key) => process.env[key] ?? fileEnv[key] ?? ''

const tier = env('DEPLOYMENT_TIER').toLowerCase()
const warnings = []
const errors = []

const workerMonitor = env('OPS_WORKER_MONITOR')
const workerExternal = env('CONNECT_WORKER_EXTERNAL')

if (!tier) {
  warnings.push('DEPLOYMENT_TIER não definido — use integration | preview | production')
}

const rules = {
  integration: {
    workerMonitor: ['0', '', undefined],
    workerExternal: null,
  },
  preview: {
    workerMonitor: ['1'],
    workerExternal: ['1'],
  },
  production: {
    workerMonitor: ['1'],
    workerExternal: ['1'],
  },
}

if (tier && rules[tier]) {
  const r = rules[tier]
  if (r.workerMonitor && !r.workerMonitor.includes(workerMonitor)) {
    errors.push(
      `DEPLOYMENT_TIER=${tier} espera OPS_WORKER_MONITOR=${r.workerMonitor.filter(Boolean).join(' ou ')} (atual: ${workerMonitor || 'unset'})`,
    )
  }
  if (r.workerExternal && !r.workerExternal.includes(workerExternal)) {
    errors.push(
      `DEPLOYMENT_TIER=${tier} espera CONNECT_WORKER_EXTERNAL=1 (atual: ${workerExternal || 'unset'})`,
    )
  }
}

if (workerMonitor === '1' && workerExternal !== '1') {
  warnings.push(
    'OPS_WORKER_MONITOR=1 sem CONNECT_WORKER_EXTERNAL=1 — alerta worker_stale se connect-worker não roda',
  )
}

if (tier === 'integration' && env('OPS_ALERTS_DISPATCH_MODE') === 'all') {
  warnings.push('Integração com OPS_ALERTS_DISPATCH_MODE=all pode spammar webhook')
}

for (const w of warnings) console.warn(`⚠️  ${w}`)
for (const e of errors) console.error(`❌ ${e}`)

if (errors.length) {
  console.error(`\nvalidate-env-tier: ${errors.length} erro(s) — ver docs/infra/GITHUB_ENVIRONMENTS_SECRETS.md`)
  process.exit(1)
}

console.log(`validate-env-tier OK (tier=${tier || 'unset'})`)
