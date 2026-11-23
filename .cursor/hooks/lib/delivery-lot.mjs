import { execSync } from 'node:child_process'
import { existsSync, mkdirSync, readFileSync, unlinkSync, writeFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { statePath } from './bootstrap-context.mjs'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '../../..')
const PENDING = statePath('delivery-lot-pending.json')
const STATUS_FILE = join(ROOT, 'docs/infra/preview-deploy-status.json')

/** Alteração de produto que pode exigir promote em lote (não por PR). */
export function markDeliveryLotPending(filePath) {
  mkdirSync(statePath('..'), { recursive: true })
  writeFileSync(
    PENDING,
    JSON.stringify({ at: new Date().toISOString(), filePath }, null, 2),
    'utf8',
  )
}

export function clearDeliveryLotPending() {
  if (existsSync(PENDING)) unlinkSync(PENDING)
}

export function readDeliveryLotPending() {
  if (!existsSync(PENDING)) return null
  try {
    return JSON.parse(readFileSync(PENDING, 'utf8'))
  } catch {
    return null
  }
}

export function readPreviewDeployStatus() {
  if (!existsSync(STATUS_FILE)) return null
  try {
    return JSON.parse(readFileSync(STATUS_FILE, 'utf8'))
  } catch {
    return null
  }
}

export function resolveMainHeadSha() {
  try {
    return execSync('git rev-parse origin/main', { cwd: ROOT, encoding: 'utf8' }).trim()
  } catch {
    try {
      return execSync('git rev-parse main', { cwd: ROOT, encoding: 'utf8' }).trim()
    } catch {
      return null
    }
  }
}

/** Mensagem curta para hook `stop` — sem disparar workflow. */
export function deliveryLotFollowupMessage() {
  const pending = readDeliveryLotPending()
  const status = readPreviewDeployStatus()
  const mainSha = resolveMainHeadSha()
  const previewSha = status?.lastPromoteMainSha ?? null
  const stale = Boolean(mainSha && previewSha && mainSha !== previewSha)

  if (!pending && !stale) return null

  const parts = [
    'Triângulo entrega (lote beta, sem promote por PR):',
    '1) Merge + CI em main — ok continuar várias vezes ao dia.',
    '2) Promote Preview só no fechamento de lote ou quando Rafael pedir (Actions → Promote, deploy_gcp=true).',
    '3) Atualizar docs/infra/PREVIEW_DEPLOY_LOT.md + preview-deploy-status.json + store internal/beta/ (SHA, o que testar).',
    'Não dispare workflow_dispatch automaticamente.',
  ]
  if (pending) parts.push(`Produto tocado: ${pending.filePath}.`)
  if (stale && mainSha && previewSha) {
    parts.push(`Preview SHA ${previewSha.slice(0, 7)} ≠ main ${mainSha.slice(0, 7)} — promote pendente no lote.`)
  }
  return parts.join(' ')
}