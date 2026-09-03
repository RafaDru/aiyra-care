/**
 * Validação completa Preview local (Ambiente 2) — ritual antes do teste manual.
 * Uso: npm run preview:validate
 */
import { spawnSync } from 'child_process'
import { config } from 'dotenv'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
config({ path: resolve(root, '.env') })
config({ path: resolve(root, '.env.preview'), override: true })

const previewEnv = { ...process.env }
const apiBase = (previewEnv.API_PUBLIC_URL ?? 'http://127.0.0.1:3020').replace(/\/$/, '')
const apiPort = previewEnv.PORT ?? '3020'
const apiHealthFallback = `http://127.0.0.1:${apiPort}`
const consolePort = previewEnv.OPS_CONSOLE_PORT ?? '3023'
const notifierPort = previewEnv.OPS_LOCAL_NOTIFIER_PORT ?? '3022'
const webPort = '5174'

const results = []

function run(label, command, args, optional = false) {
  const r = spawnSync(command, args, {
    cwd: root,
    shell: true,
    encoding: 'utf8',
    env: previewEnv,
  })
  const ok = r.status === 0
  results.push({ label, ok, optional, detail: ok ? '' : (r.stderr || r.stdout || '').slice(0, 300) })
  console.log(`${ok ? '✅' : optional ? '⏭️' : '❌'} ${label}`)
  if (!ok && !optional) {
    console.error((r.stderr || r.stdout || '').slice(0, 400))
    process.exit(1)
  }
  return ok
}

async function fetchOk(url, headers = {}) {
  try {
    const res = await fetch(url, { headers, signal: AbortSignal.timeout(8000) })
    return res.ok
  } catch {
    return false
  }
}

console.log('=== preview:validate (Ambiente 2) ===')
console.log(`  API ${apiBase}`)
console.log(`  PG  ${previewEnv.DATABASE_URL ? 'aiyracare_preview (set)' : 'MISSING'}`)
console.log('')

run('validate:ops-dual-keys', 'npm', ['run', 'validate:ops-dual-keys'])
run('validate:env-tier (preview)', 'node', ['scripts/validate-env-tier.mjs', '--preview'])

const healthApi = (await fetchOk(`${apiBase}/health`)) || (await fetchOk(`${apiHealthFallback}/health`))
results.push({ label: `API ${apiBase}/health`, ok: healthApi, optional: false, detail: '' })
console.log(`${healthApi ? '✅' : '❌'} API ${apiBase}/health`)
if (!healthApi) {
  console.error('Suba preview: npm run up:preview')
  process.exit(1)
}

const consoleOk = await fetchOk(`http://127.0.0.1:${consolePort}/health`)
results.push({ label: `Ops console :${consolePort}`, ok: consoleOk, optional: false, detail: '' })
console.log(`${consoleOk ? '✅' : '❌'} Ops console :${consolePort}`)

const notifierOk = await fetchOk(`http://127.0.0.1:${notifierPort}/health`)
results.push({ label: `Notifier :${notifierPort}`, ok: notifierOk, optional: true, detail: '' })
console.log(`${notifierOk ? '✅' : '⏭️'} Notifier :${notifierPort}${notifierOk ? '' : ' (opcional — npm run ops:notifier:up com OPS_LOCAL_NOTIFIER_PORT=3022)'}`)

const webOk = await fetchOk(`http://localhost:${webPort}`)
results.push({ label: `Web :${webPort}`, ok: webOk, optional: false, detail: '' })
console.log(`${webOk ? '✅' : '❌'} Web :${webPort}`)

const key = previewEnv.OPS_METRICS_KEY?.trim()
if (key) {
  const metricsOk = await fetchOk(`${apiBase}/ops/metrics`, { 'x-internal-ops-key': key })
  results.push({ label: 'GET /ops/metrics (preview key)', ok: metricsOk, optional: false, detail: '' })
  console.log(`${metricsOk ? '✅' : '❌'} GET /ops/metrics (preview key)`)
}

run('preview:post-deploy', 'npm', ['run', 'preview:post-deploy'])

const smokeEnv = {
  ...previewEnv,
  OPS_SMOKE_SKIP_HTTP: '0',
  OPS_SMOKE_FULL: notifierOk ? '1' : '0',
}
const smoke = spawnSync('npm', ['run', 'ops:smoke'], {
  cwd: resolve(root, 'packages/api'),
  shell: true,
  encoding: 'utf8',
  env: smokeEnv,
})
const smokeOk = smoke.status === 0
results.push({ label: 'ops:smoke (preview)', ok: smokeOk, optional: false, detail: '' })
console.log(`${smokeOk ? '✅' : '❌'} ops:smoke (preview)`)
if (!smokeOk) {
  console.error(smoke.stderr || smoke.stdout)
  process.exit(1)
}

run('dev-audit:bridge', 'npm', ['run', 'dev-audit:bridge'], true)

const failed = results.filter((r) => !r.ok && !r.optional)
console.log('')
if (failed.length) {
  console.error(`preview:validate FAILED (${failed.length} checks)`)
  process.exit(1)
}
console.log('preview:validate OK — ver docs/infra/PREVIEW_LOCAL_TEST_GUIDE.md')
console.log(`  Web:     http://localhost:${webPort}`)
console.log(`  Console: http://127.0.0.1:${consolePort}`)
