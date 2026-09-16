/**
 * Orquestrador de suites QA manuais.
 *
 * Uso:
 *   node scripts/qa-suite.mjs list
 *   node scripts/qa-suite.mjs run --suite <id> [--preview]
 *   node scripts/qa-suite.mjs run-all --lane regression [--preview]
 */
import { readFileSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const catalogPath = resolve(root, 'docs/testing/suites/index.json')

function loadCatalog() {
  return JSON.parse(readFileSync(catalogPath, 'utf8'))
}

function parseArgs(argv) {
  const args = { command: argv[0], suite: null, lane: null, preview: false }
  for (let i = 1; i < argv.length; i++) {
    if (argv[i] === '--suite' && argv[i + 1]) args.suite = argv[++i]
    else if (argv[i] === '--lane' && argv[i + 1]) args.lane = argv[++i]
    else if (argv[i] === '--preview') args.preview = true
  }
  return args
}

function envUrls(preview) {
  if (preview) {
    return { api: 'http://127.0.0.1:3020', web: 'http://localhost:5174', label: 'preview' }
  }
  return { api: 'http://127.0.0.1:3010', web: 'http://localhost:5173', label: 'dev' }
}

async function checkUrl(name, url) {
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(8000) })
    return { name, ok: res.ok, detail: `HTTP ${res.status}` }
  } catch (e) {
    return { name, ok: false, detail: String(e.message ?? e) }
  }
}

async function preflight(preview) {
  const { api, web, label } = envUrls(preview)
  console.log(`\n=== Pré-voo (${label}) ===`)
  const checks = await Promise.all([
    checkUrl('API /health', `${api}/health`),
    checkUrl('Web /login', `${web}/login`),
  ])
  for (const c of checks) {
    console.log(`[${c.ok ? 'OK' : 'FAIL'}] ${c.name} — ${c.detail}`)
  }
  return checks.every((c) => c.ok)
}

function printSuite(s) {
  const auto = s.automation?.status ?? 'manual'
  const spec = s.automation?.spec ?? '—'
  const domain = s.domain ?? '—'
  const cov = s.coverage ?? '—'
  console.log(`  ${s.id}`)
  console.log(`    ${s.title}`)
  console.log(`    domain=${domain} lane=${s.lane} coverage=${cov} automation=${auto}`)
  console.log(`    doc: ${s.doc}`)
  if (spec !== '—') console.log(`    spec: ${spec}`)
  if (s.blockedBy?.length) console.log(`    blockedBy: ${s.blockedBy.join(', ')}`)
  console.log('')
}

function cmdList() {
  const cat = loadCatalog()
  console.log(`\nQA Suites (${cat.suites.length}) — atualizado ${cat.updatedAt}`)
  console.log(`Matriz: docs/testing/BUSINESS_ACTION_MATRIX.md\n`)
  for (const s of cat.suites) {
    printSuite(s)
  }
  console.log('Lanes:')
  for (const [id, lane] of Object.entries(cat.lanes)) {
    const ids = lane.suiteIds?.join(', ') ?? '(por suite.lane)'
    console.log(`  ${id}: ${lane.title} — ${ids}`)
  }
  console.log('\nComandos:')
  console.log('  npm run qa:run-all -- --lane regression')
  console.log('  npm run qa:run-all -- --lane business-full   # CRUD completo via UI')
  console.log('  npm run qa:run-all -- --lane ava')
}

async function cmdRun(suiteId, preview) {
  const cat = loadCatalog()
  let suite = cat.suites.find((s) => s.id === suiteId)
  if (!suite) {
    suite = cat.suites.find((s) => s.aliases?.includes(suiteId))
  }
  if (!suite) {
    console.error(`Suite não encontrada: ${suiteId}`)
    console.error('Use: npm run qa:list')
    process.exit(1)
  }

  console.log(`\n╔══════════════════════════════════════════════════════════╗`)
  console.log(`║  QA RUN: ${suite.id}`)
  console.log(`╚══════════════════════════════════════════════════════════╝`)
  console.log(`Título:    ${suite.title}`)
  console.log(`Lane:      ${suite.lane}`)
  console.log(`Fixture:   ${suite.fixtureId}`)
  console.log(`Doc:       ${suite.doc}`)
  console.log(`Automação: ${suite.automation?.status ?? 'manual'}`)

  if (suite.blockedBy?.length) {
    console.log(`\n⚠️  BLOCKED BY: ${suite.blockedBy.join(', ')}`)
    console.log('   Execute setup ou marque relatório como BLOCKED.\n')
  }

  const fixturePath = resolve(root, 'docs/testing/fixtures', `${suite.fixtureId}.json`)
  try {
    const fixture = JSON.parse(readFileSync(fixturePath, 'utf8'))
    console.log(`\n--- Fixture: ${fixture.id} ---`)
    if (fixture.seedScript) console.log(`Seed: ${fixture.seedScript}`)
    if (fixture.linkScript) console.log(`Link: ${fixture.linkScript}`)
    if (fixture.status === 'planned') console.log('Status fixture: PLANNED — massa ainda não automatizada')
  } catch {
    console.log(`\n(fixture ${suite.fixtureId} — sem JSON ou ops-local)`)
  }

  await preflight(preview)

  console.log(`\n--- Checklist ---`)
  console.log(`Abra e execute cada passo:`)
  console.log(`  ${suite.doc}`)
  console.log(`\nRelatório: ver docs/testing/QA_PROCESS.md (formato PASS/FAIL)`)
}

async function cmdRunAll(laneId, preview) {
  const cat = loadCatalog()
  const lane = cat.lanes[laneId]
  if (!lane) {
    console.error(`Lane não encontrada: ${laneId}`)
    process.exit(1)
  }

  let suites = cat.suites.filter((s) => s.lane === laneId && s.requiredForMain !== false)
  if (lane.suiteIds) {
    suites = lane.suiteIds
      .map((id) => cat.suites.find((s) => s.id === id))
      .filter(Boolean)
  }

  const parallel = laneId === 'business-full' || laneId === 'ava'
  console.log(`\n╔══════════════════════════════════════════════════════════╗`)
  console.log(`║  QA RUN-ALL: lane=${laneId} (${suites.length} suites${parallel ? ', PARALELO por domínio' : ', SEQUENCIAL'})`)
  console.log(`╚══════════════════════════════════════════════════════════╝`)
  console.log(lane.description ?? '')

  const envOk = await preflight(preview)
  if (!envOk) {
    console.log('\n❌ Pré-voo falhou — corrija ambiente antes da regressão.\n')
    process.exit(1)
  }

  for (let i = 0; i < suites.length; i++) {
    const s = suites[i]
    console.log(`\n[${i + 1}/${suites.length}] ${s.id} — ${s.title}`)
    console.log(`  → ${s.doc}`)
    if (s.blockedBy?.length) {
      console.log(`  ⚠️  BLOCKED: ${s.blockedBy.join(', ')} — registrar BLOCKED no relatório`)
    }
  }

  console.log(`\nExecute as suites na ordem acima. Veredito global: FAIL se qualquer obrigatória falhar.`)
}

async function main() {
  const args = parseArgs(process.argv.slice(2))
  if (!args.command || args.command === 'list') {
    cmdList()
    return
  }
  if (args.command === 'run') {
    if (!args.suite) {
      console.error('Uso: npm run qa:run -- --suite <id> [--preview]')
      process.exit(1)
    }
    await cmdRun(args.suite, args.preview)
    return
  }
  if (args.command === 'run-all') {
    if (!args.lane) {
      console.error('Uso: npm run qa:run-all -- --lane regression [--preview]')
      process.exit(1)
    }
    await cmdRunAll(args.lane, args.preview)
    return
  }
  console.error(`Comando desconhecido: ${args.command}`)
  process.exit(1)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
