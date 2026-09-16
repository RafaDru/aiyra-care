import { mkdirSync, writeFileSync, readFileSync, unlinkSync, existsSync } from 'node:fs'
import { statePath } from './bootstrap-context.mjs'

const PENDING = statePath('doc-ritual-pending.json')

const PRODUCT_PATTERNS = [
  /^packages\/api\/src\/(application|domain|infrastructure)\//i,
  /^packages\/web\/src\/(pages|components)\//i,
]

const DOC_PATTERNS = [
  /^docs\/roadmap\.json$/i,
  /^docs\/features\//i,
  /^docs\/help\//i,
  /^docs\/HISTORICO\.md$/i,
  /^docs\/project-context\.json$/i,
]

export function normalizePath(p) {
  if (!p) return ''
  return String(p).replace(/\\/g, '/')
}

export function isProductPath(p) {
  return PRODUCT_PATTERNS.some((re) => re.test(p))
}

export function isDocPath(p) {
  return DOC_PATTERNS.some((re) => re.test(p))
}

export function markDocRitualPending(reason, filePath) {
  mkdirSync(statePath('..'), { recursive: true })
  writeFileSync(
    PENDING,
    JSON.stringify({
      at: new Date().toISOString(),
      reason,
      filePath,
    }),
    'utf8',
  )
}

export function clearDocRitualPending() {
  if (existsSync(PENDING)) unlinkSync(PENDING)
}

export function readDocRitualPending() {
  if (!existsSync(PENDING)) return null
  try {
    return JSON.parse(readFileSync(PENDING, 'utf8'))
  } catch {
    return null
  }
}
