/**
 * Post-deploy Preview (Ambiente 2) — local ou host cloud.
 * Uso: npm run preview:post-deploy
 * Env: API_PUBLIC_URL, DATABASE_URL (.env + .env.preview); SKIP_SEED=1 pula refresh.
 */
import { spawnSync } from 'child_process'
import { config } from 'dotenv'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const apiDir = resolve(root, 'packages/api')
config({ path: resolve(root, '.env') })
config({ path: resolve(root, '.env.preview') })

const skipSeed = process.env.SKIP_SEED === '1' || process.env.SKIP_SEED === 'true'
const apiBase = (process.env.API_PUBLIC_URL ?? 'http://127.0.0.1:3020').replace(/\/$/, '')

function run(label, command, args, extraEnv = {}) {
  console.log(`\n=== ${label} ===`)
  const r = spawnSync(command, args, {
    cwd: apiDir,
    shell: true,
    encoding: 'utf8',
    env: { ...process.env, API_PUBLIC_URL: apiBase, ...extraEnv },
  })
  if (r.status !== 0) {
    console.error(r.stderr || r.stdout || `${label} failed`)
    process.exit(r.status ?? 1)
  }
  if (r.stdout?.trim()) console.log(r.stdout.trim())
}

console.log('preview-post-deploy')
console.log(`  API_PUBLIC_URL=${apiBase}`)
console.log(`  DATABASE_URL=${process.env.DATABASE_URL ? '(set)' : '(unset — seed skipped)'}`)
console.log(`  SKIP_SEED=${skipSeed}`)

if (!skipSeed && process.env.DATABASE_URL) {
  run('seed:staging-refresh', 'npm', ['run', 'seed:staging-refresh'])
} else if (!skipSeed) {
  console.warn('SKIP seed:staging-refresh — DATABASE_URL não definido')
}

run('staging:probe-gate', 'npm', ['run', 'staging:probe-gate'])
run('ops:alerts-check', 'npm', ['run', 'ops:alerts-check'])

console.log('\npreview-post-deploy OK')
