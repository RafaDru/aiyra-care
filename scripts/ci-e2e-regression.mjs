/**
 * Orquestra E2E regression (mesma sequência do workflow ci-e2e-regression.yml).
 * Uso local (API já em :3010 ou deixe subir abaixo):
 *   DATABASE_URL=... SUPABASE_URL=... SUPABASE_SERVICE_ROLE=... VITE_SUPABASE_ANON_KEY=... CRYPTO_KEY=... node scripts/ci-e2e-regression.mjs
 *   node scripts/ci-e2e-regression.mjs --skip-api-start   # API já rodando
 */
import { spawn, spawnSync } from 'child_process'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const skipApiStart = process.argv.includes('--skip-api-start')

const required = [
  'DATABASE_URL',
  'CRYPTO_KEY',
  'SUPABASE_URL',
  'SUPABASE_SERVICE_ROLE',
  'VITE_SUPABASE_ANON_KEY',
]

for (const key of required) {
  if (!process.env[key]?.trim()) {
    console.error(`ci-e2e-regression: ${key} obrigatório`)
    process.exit(1)
  }
}

process.env.VITE_SUPABASE_URL = process.env.VITE_SUPABASE_URL ?? process.env.SUPABASE_URL
process.env.VITE_API_URL = process.env.VITE_API_URL ?? 'http://127.0.0.1:3010'
process.env.PORT = process.env.PORT ?? '3010'
process.env.CI = process.env.CI ?? '1'
process.env.AVA_TEST_MODE = process.env.AVA_TEST_MODE ?? '1'

function run(label, command, args, opts = {}) {
  console.log(`\n=== ${label} ===`)
  const r = spawnSync(command, args, {
    cwd: opts.cwd ?? root,
    stdio: 'inherit',
    shell: true,
    env: process.env,
  })
  if (r.status !== 0) {
    console.error(`ci-e2e-regression FAILED: ${label}`)
    process.exit(r.status ?? 1)
  }
}

async function waitForHealth(url, attempts = 45, delayMs = 2000) {
  for (let i = 0; i < attempts; i++) {
    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(5000) })
      if (res.ok) return
    } catch {
      // retry
    }
    await new Promise((r) => setTimeout(r, delayMs))
  }
  throw new Error(`API não respondeu em ${url}`)
}

run('migrate:dry-run', 'npm', ['run', 'migrate:dry-run'])
run('seed-legal', 'node', ['packages/api/scripts/seed-legal-documents.mjs'])
run('qa:create-test-user', 'npm', ['run', 'qa:create-test-user'])
run('qa:create-onboarding-user', 'npm', ['run', 'qa:create-onboarding-user'])
run('api:build', 'npm', ['run', 'build'], { cwd: resolve(root, 'packages/api') })

let apiChild = null
if (!skipApiStart) {
  apiChild = spawn('node', ['dist/index.js'], {
    cwd: resolve(root, 'packages/api'),
    env: process.env,
    stdio: 'inherit',
    detached: process.platform !== 'win32',
  })
  await waitForHealth(`${process.env.VITE_API_URL}/health`)
}

try {
  run('playwright:regression', 'npm', ['run', 'test:e2e:regression'])
} finally {
  if (apiChild?.pid) {
    try {
      if (process.platform === 'win32') {
        spawnSync('taskkill', ['/F', '/T', '/PID', String(apiChild.pid)], { stdio: 'ignore' })
      } else {
        process.kill(-apiChild.pid, 'SIGTERM')
      }
    } catch {
      // ignore
    }
  }
}

console.log('\nci-e2e-regression OK')
