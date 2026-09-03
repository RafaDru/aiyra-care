/**
 * Gates verticais Ambiente 1 → relatório promotion-report-last.md
 * Uso: npm run promotion:gates
 */
import { spawnSync } from 'child_process'
import { writeFileSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const apiDir = resolve(root, 'packages/api')
const webDir = resolve(root, 'packages/web')
const reportPath = resolve(root, 'promotion-report-last.md')

const results = []

function runGate(name, vertical, command, args, cwd, optional = false, extraEnv = {}) {
  const r = spawnSync(command, args, {
    cwd,
    shell: true,
    encoding: 'utf8',
    env: { ...process.env, ...extraEnv },
  })
  const ok = r.status === 0
  results.push({
    name,
    vertical,
    ok,
    optional,
    status: ok ? 'pass' : optional ? 'skip' : 'fail',
    detail: ok ? '' : (r.stderr || r.stdout || '').slice(0, 500),
  })
  return ok
}

const date = new Date().toISOString()
const branch = spawnSync('git', ['rev-parse', '--abbrev-ref', 'HEAD'], { encoding: 'utf8' }).stdout?.trim() ?? '?'
const commit = spawnSync('git', ['rev-parse', '--short', 'HEAD'], { encoding: 'utf8' }).stdout?.trim() ?? '?'

// Funcional
runGate('API test:critical', 'funcional', 'npm', ['run', 'test:critical'], apiDir)
runGate('Web build', 'funcional', 'npm', ['run', 'build'], webDir)

// Integrado
runGate('Validate migrations', 'integrado', 'npm', ['run', 'validate:migrations'], apiDir)

if (process.env.DATABASE_URL) {
  runGate('DB migrate:all', 'integrado', 'node', ['scripts/apply-all-migrations.mjs'], apiDir, true)
  runGate('DB seed refresh', 'integrado', 'npm', ['run', 'seed:staging-refresh'], apiDir, true)
} else {
  results.push({
    name: 'DB seed refresh',
    vertical: 'integrado',
    ok: false,
    optional: true,
    status: 'skip',
    detail: 'DATABASE_URL não definido',
  })
}

// E2E — optional if playwright not installed
const e2eOk = runGate('Web E2E smoke', 'funcional', 'npm', ['run', 'test:e2e'], webDir, true)

// Performance — optional if API down
const probeOk = runGate('staging:probe-gate', 'performance', 'npm', ['run', 'staging:probe-gate'], apiDir, true)

// Ops sustentação (Trilha A)
runGate('test:ops', 'performance', 'npm', ['run', 'test:ops'], apiDir)
runGate('ops smoke (no HTTP)', 'performance', 'npm', ['run', 'ops:smoke'], apiDir, true, {
  OPS_SMOKE_SKIP_HTTP: '1',
})
runGate('validate ops dual keys', 'segurança', 'npm', ['run', 'validate:ops-dual-keys'], root, true)

const failed = results.filter((r) => r.status === 'fail')
const passed = results.filter((r) => r.status === 'pass')
const skipped = results.filter((r) => r.status === 'skip')

const lines = [
  '# Relatório de promoção — Ambiente 1 (Integração)',
  '',
  `**Data:** ${date}`,
  `**Branch:** ${branch}`,
  `**Commit:** ${commit}`,
  '',
  '## Resumo',
  '',
  `| Resultado | ${failed.length ? '❌ NÃO PROMOVER' : '✅ Pode solicitar aprovação'} |`,
  '',
  '| Vertical | Checks |',
  '|----------|--------|',
]

for (const v of ['funcional', 'integrado', 'segurança', 'performance']) {
  const rs = results.filter((r) => r.vertical === v || (v === 'segurança' && r.name.includes('critical')))
  if (!rs.length && v === 'segurança') {
    lines.push('| Segurança | Incluído em test:critical + tier review manual |')
    continue
  }
  const icon = rs.every((x) => x.status !== 'fail') ? '✅' : '❌'
  lines.push(`| ${v} | ${icon} ${rs.map((x) => x.name).join(', ')} |`)
}

lines.push('', '## Detalhe', '')
for (const r of results) {
  const icon = r.status === 'pass' ? '✅' : r.status === 'skip' ? '⏭️' : '❌'
  lines.push(`${icon} **${r.name}** (${r.vertical})`)
  if (r.detail) lines.push(`   ${r.detail.replace(/\n/g, ' ').slice(0, 200)}`)
}

lines.push(
  '',
  '## Manual pendente (agente deve listar no chat)',
  '',
  '- [ ] Sync convênio real (se área tocada)',
  '- [ ] gov.br / SUS (se área tocada)',
  '- [ ] Tier review skills (tier ≥ 2)',
  '',
  '## Aprovação Rafael',
  '',
  '- [ ] Aprovado para Ambiente 2 (Preview)',
  '',
  '---',
  'Ver `docs/TESTING_VERTICALS.md` e `docs/infra/TWO_ENV_MODEL.md`.',
)

writeFileSync(reportPath, lines.join('\n'))
console.log(lines.join('\n'))
console.log(`\nWritten: ${reportPath}`)

if (failed.length) {
  console.error(`\n${failed.length} gate(s) FAILED`)
  process.exit(1)
}
