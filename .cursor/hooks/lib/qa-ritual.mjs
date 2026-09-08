import { mkdirSync, writeFileSync, readFileSync, unlinkSync, existsSync } from 'node:fs'
import { statePath } from './bootstrap-context.mjs'
import { isProductPath, normalizePath } from './doc-ritual.mjs'

const PENDING = statePath('qa-ritual-pending.json')

const QA_DOC_PATTERNS = [
  /^docs\/testing\/suites\/(?!_TEMPLATE\.md$)[^/]+\.md$/i,
  /^docs\/testing\/suites\/index\.json$/i,
  /^docs\/testing\/fixtures\/[^/]+\.json$/i,
]

const QA_RUN_PATTERNS = [
  /\bqa:run\b/i,
  /\bqa:run-all\b/i,
  /qa-suite\.mjs\s+run\b/i,
  /qa-suite\.mjs\s+run-all\b/i,
]

export function isQaDocPath(p) {
  const n = normalizePath(p)
  return QA_DOC_PATTERNS.some((re) => re.test(n))
}

export function isQaRunCommand(command) {
  return QA_RUN_PATTERNS.some((re) => re.test(String(command ?? '')))
}

export function readQaRitualPending() {
  if (!existsSync(PENDING)) return null
  try {
    return JSON.parse(readFileSync(PENDING, 'utf8'))
  } catch {
    return null
  }
}

export function writeQaRitualPending(data) {
  mkdirSync(statePath('..'), { recursive: true })
  writeFileSync(PENDING, JSON.stringify(data, null, 2), 'utf8')
}

export function markQaRitualPending(triggerFile) {
  const existing = readQaRitualPending()
  writeQaRitualPending({
    at: new Date().toISOString(),
    triggerFile: normalizePath(triggerFile),
    suiteDocUpdated: existing?.suiteDocUpdated ?? false,
    qaExecutedAt: null,
    qaCommand: null,
  })
}

export function touchQaSuiteDoc(filePath) {
  const p = normalizePath(filePath)
  const existing = readQaRitualPending()
  if (!existing) {
    writeQaRitualPending({
      at: new Date().toISOString(),
      triggerFile: p,
      suiteDocUpdated: true,
      qaExecutedAt: null,
      qaCommand: null,
      note: 'qa_docs_only',
    })
    return
  }
  writeQaRitualPending({
    ...existing,
    suiteDocUpdated: true,
    lastQaDoc: p,
  })
}

export function recordQaExecution(command) {
  const existing = readQaRitualPending()
  const now = new Date().toISOString()
  if (!existing) {
    writeQaRitualPending({
      at: now,
      triggerFile: null,
      suiteDocUpdated: true,
      qaExecutedAt: now,
      qaCommand: String(command).slice(0, 500),
      note: 'qa_run_without_product_edit',
    })
    return
  }
  writeQaRitualPending({
    ...existing,
    qaExecutedAt: now,
    qaCommand: String(command).slice(0, 500),
  })
}

export function clearQaRitualPending() {
  if (existsSync(PENDING)) unlinkSync(PENDING)
}

/** Produto alterado nesta sessão e suite QA ainda não executada. */
export function isQaRitualBlocking() {
  const p = readQaRitualPending()
  if (!p?.triggerFile || p.note === 'qa_docs_only') return false
  if (!isProductPath(p.triggerFile)) return false
  return !p.qaExecutedAt
}

export function qaRitualFollowupMessage(pending) {
  const lines = [
    'Ritual QA pendente — entrega de produto sem teste integrado executado.',
    `Edição que disparou: ${pending.triggerFile}`,
  ]
  if (!pending.suiteDocUpdated) {
    lines.push(
      'Atualize ou confirme a suite: docs/testing/suites/<suite-id>.md + suites/index.json (docs/testing/QA_PROCESS.md).',
    )
  }
  lines.push(
    'Execute: npm run qa:run -- --suite <id> (feature) ou npm run qa:run-all -- --lane regression (antes de push main).',
    'Entregue relatório PASS/FAIL no chat antes de encerrar.',
    'Docs: docs/testing/MANUAL_TEST_RUNBOOK.md',
  )
  return lines.join(' ')
}
