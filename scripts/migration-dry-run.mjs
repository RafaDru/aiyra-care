/**
 * Migration dry-run — valida SQL + aplica em PG efêmero (CI ou local).
 * Uso: DATABASE_URL=postgresql://... npm run migrate:dry-run
 */
import { spawnSync } from 'child_process'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const apiDir = resolve(root, 'packages/api')

if (!process.env.DATABASE_URL?.trim()) {
  console.error('migrate:dry-run: DATABASE_URL obrigatório')
  process.exit(1)
}

function run(label, cwd, command, args) {
  console.log(`\n=== ${label} ===`)
  const r = spawnSync(command, args, { cwd, stdio: 'inherit', shell: true, env: process.env })
  if (r.status !== 0) {
    console.error(`migrate:dry-run FAILED at: ${label}`)
    process.exit(r.status ?? 1)
  }
}

console.log('migrate:dry-run')
console.log(`  DATABASE_URL=${process.env.DATABASE_URL.replace(/:[^:@/]+@/, ':***@')}`)

run('validate-migrations', apiDir, 'npm', ['run', 'validate:migrations'])
run('apply-all-migrations', apiDir, 'node', ['scripts/apply-all-migrations.mjs'])

console.log('\nmigrate:dry-run OK')
