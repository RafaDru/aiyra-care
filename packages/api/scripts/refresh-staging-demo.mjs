/**
 * Refresh completo da massa demo + volume staging.
 *   node scripts/refresh-staging-demo.mjs
 */
import { spawnSync } from 'child_process'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const scriptsDir = dirname(fileURLToPath(import.meta.url))

function run(script, args = []) {
  const scriptPath = resolve(scriptsDir, script)
  const r = spawnSync(process.execPath, [scriptPath, ...args], {
    stdio: 'inherit',
    env: process.env,
  })
  if (r.status !== 0) {
    throw new Error(`${script} exit ${r.status ?? 'signal'}`)
  }
}

console.log('refresh-staging-demo: reset + seed demo + staging volume')
run('seed-demo-data.mjs', ['--reset'])
run('seed-staging-volume.mjs', ['--reset'])
console.log('refresh-staging-demo OK')
