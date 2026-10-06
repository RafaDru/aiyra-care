#!/usr/bin/env node
/**
 * Registra G3 «Aprovar para merge» no ops-console (equivalente ao botão CH).
 *
 * Uso:
 *   node scripts/ch-defect-operator-approve.mjs --ref DEF-000042
 *   node scripts/ch-defect-operator-approve.mjs --id <uuid> [--note "..."]
 *   node scripts/ch-defect-operator-approve.mjs --ref DEF-000042 --dry-run
 *
 * Env: OPS_CONSOLE_PORT (default 3013), OPS_METRICS_KEY (opcional — header x-internal-ops-key),
 *      CH_G3_REQUIRE_REVIEW_APPROVE, CH_G3_AGENTIC_AUTO_APPROVE (hook no review-callback, não neste script).
 */
import { config } from 'dotenv'
import { dirname, resolve } from 'path'
import { fileURLToPath } from 'url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
config({ path: resolve(root, '.env') })
config({ path: resolve(root, '.env.preview'), override: false })

function parseArgs(argv) {
  const out = { dryRun: false, note: undefined, id: undefined, ref: undefined, override: false, overrideReason: undefined }
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i]
    if (a === '--dry-run') out.dryRun = true
    else if (a === '--override') out.override = true
    else if (a === '--note') out.note = argv[++i]
    else if (a === '--id') out.id = argv[++i]
    else if (a === '--ref') out.ref = argv[++i]
    else if (a === '--override-reason') out.overrideReason = argv[++i]
    else if (a === '--help' || a === '-h') {
      console.log(`Usage: node scripts/ch-defect-operator-approve.mjs (--id <uuid> | --ref DEF-NNNNNN) [options]
Options:
  --note <text>           Nota de auditoria opcional
  --override              Bypass CH_G3_REQUIRE_REVIEW_APPROVE (exige --override-reason)
  --override-reason <t>   Motivo do override
  --dry-run               Resolve defeito e imprime payload sem POST
`)
      process.exit(0)
    } else {
      console.error(`Argumento desconhecido: ${a}`)
      process.exit(1)
    }
  }
  if (!out.id && !out.ref) {
    console.error('Informe --id ou --ref')
    process.exit(1)
  }
  if (out.override && !out.overrideReason?.trim()) {
    console.error('--override exige --override-reason')
    process.exit(1)
  }
  return out
}

function resolveConsoleBase() {
  const explicit = process.env.OPS_CONSOLE_PUBLIC_URL?.trim() || process.env.VITE_OPS_CONSOLE_URL?.trim()
  if (explicit) return explicit.replace(/\/$/, '')
  const port = process.env.OPS_CONSOLE_PORT?.trim() || '3013'
  const host = process.env.OPS_CONSOLE_HOST?.trim() || '127.0.0.1'
  return `http://${host}:${port}`
}

function opsHeaders() {
  const headers = { 'Content-Type': 'application/json', Accept: 'application/json' }
  const key = process.env.OPS_METRICS_KEY?.trim()
  if (key) headers['x-internal-ops-key'] = key
  return headers
}

async function resolveDefectId(consoleBase, ref) {
  const url = `${consoleBase}/api/platform-defects/by-ref/${encodeURIComponent(ref)}`
  const res = await fetch(url, { headers: opsHeaders() })
  if (!res.ok) {
    const body = await res.text()
    throw new Error(`by-ref ${res.status}: ${body}`)
  }
  const data = await res.json()
  return data.item?.id
}

async function main() {
  const args = parseArgs(process.argv)
  const consoleBase = resolveConsoleBase()
  let defectId = args.id
  if (!defectId && args.ref) {
    defectId = await resolveDefectId(consoleBase, args.ref)
  }
  if (!defectId) {
    console.error('Defeito não encontrado')
    process.exit(1)
  }

  const body = {}
  if (args.note) body.note = args.note
  if (args.override) {
    body.override = true
    body.overrideReason = args.overrideReason
  }

  const url = `${consoleBase}/api/platform-defects/${encodeURIComponent(defectId)}/operator-approve-pr`
  if (args.dryRun) {
    console.log(JSON.stringify({ dryRun: true, url, body, defectId }, null, 2))
    return
  }

  const res = await fetch(url, { method: 'POST', headers: opsHeaders(), body: JSON.stringify(body) })
  const text = await res.text()
  let json
  try {
    json = text ? JSON.parse(text) : {}
  } catch {
    json = { raw: text }
  }
  if (!res.ok) {
    console.error(JSON.stringify({ ok: false, status: res.status, ...json }, null, 2))
    process.exit(1)
  }
  console.log(JSON.stringify({ ok: true, status: res.status, ...json }, null, 2))
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err)
  process.exit(1)
})
