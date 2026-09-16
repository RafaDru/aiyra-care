/**
 * Garante OPS_METRICS_KEY e OPS_ALERT_WEBHOOK_URL distintos entre .env (integração) e .env.preview.
 * Uso: npm run validate:ops-dual-keys
 */
import { readFileSync, existsSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')

function parseEnvFile(path) {
  const out = {}
  if (!existsSync(path)) return out
  for (const line of readFileSync(path, 'utf8').split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)=(.*)$/)
    if (m) out[m[1]] = m[2].trim()
  }
  return out
}

const integrationPath = resolve(root, '.env')
const previewPath = resolve(root, '.env.preview')
const integration = parseEnvFile(integrationPath)
const preview = parseEnvFile(previewPath)

const errors = []
const warnings = []

if (!existsSync(previewPath)) {
  warnings.push('.env.preview ausente — rode npm run setup:ops-preview antes de subir Preview')
}

const keysToIsolate = ['OPS_METRICS_KEY', 'OPS_ALERT_WEBHOOK_URL', 'CRYPTO_KEY', 'DATABASE_URL']

for (const key of keysToIsolate) {
  const a = integration[key]
  const b = preview[key]
  if (a && b && a === b) {
    errors.push(`${key} idêntico em .env e .env.preview — gere chaves distintas`)
  }
}

const intKey = integration.OPS_METRICS_KEY
const prevKey = preview.OPS_METRICS_KEY
if (intKey && !prevKey && existsSync(previewPath)) {
  warnings.push('OPS_METRICS_KEY só em .env — preview herdará a mesma chave se não definir em .env.preview')
}

if (!intKey) {
  warnings.push('OPS_METRICS_KEY ausente em .env — npm run setup:ops-alerts')
}

for (const w of warnings) console.warn(`⚠️  ${w}`)
for (const e of errors) console.error(`❌ ${e}`)

if (errors.length) {
  console.error(`\nvalidate-ops-dual-keys: ${errors.length} erro(s)`)
  console.error('Ver docs/infra/OPS_TWO_ENV_SETUP.md e docs/infra/GITHUB_ENVIRONMENTS_SECRETS.md')
  process.exit(1)
}

console.log('validate-ops-dual-keys OK')
if (prevKey) {
  console.log(`  integration key: ${intKey ? `${intKey.slice(0, 8)}…` : '(unset)'}`)
  console.log(`  preview key:     ${prevKey.slice(0, 8)}…`)
}
