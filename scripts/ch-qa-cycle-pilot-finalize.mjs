#!/usr/bin/env node
/**
 * Fecha piloto QA-CYCLE no CH (DEF fixed + INC resolved) — smoke G3/G4 sem merge GitHub real.
 *
 * Uso:
 *   node scripts/ch-qa-cycle-pilot-finalize.mjs --ref DEF-000005
 *   node scripts/ch-qa-cycle-pilot-finalize.mjs --ref DEF-000005 --pr-url https://github.com/RafaDru/aiyra-care/pull/999001
 *   node scripts/ch-qa-cycle-pilot-finalize.mjs --ref DEF-000005 --webhook-only
 *   node scripts/ch-qa-cycle-pilot-finalize.mjs --ref DEF-000005 --dry-run
 *
 * Env: OPS_CONSOLE_PORT (3013), OPS_METRICS_KEY, GITHUB_DEFECT_MERGE_WEBHOOK_SECRET (webhook path),
 *      GITHUB_DEFECT_MERGE_BASE_REF (default main).
 */
import { createHmac } from 'node:crypto'
import { config } from 'dotenv'
import { dirname, resolve } from 'path'
import { fileURLToPath } from 'url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
config({ path: resolve(root, '.env') })
config({ path: resolve(root, '.env.preview'), override: false })

const DEFAULT_PR = 'https://github.com/RafaDru/aiyra-care/pull/999001'

function parseArgs(argv) {
  const out = {
    dryRun: false,
    webhookOnly: false,
    ref: 'DEF-000005',
    prUrl: DEFAULT_PR,
    id: undefined,
  }
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i]
    if (a === '--dry-run') out.dryRun = true
    else if (a === '--webhook-only') out.webhookOnly = true
    else if (a === '--ref') out.ref = argv[++i]
    else if (a === '--pr-url') out.prUrl = argv[++i]
    else if (a === '--id') out.id = argv[++i]
    else if (a === '--help' || a === '-h') {
      console.log(`Usage: node scripts/ch-qa-cycle-pilot-finalize.mjs [options]
Options:
  --ref DEF-NNNNNN   Defeito piloto (default DEF-000005)
  --id <uuid>        UUID em vez de ref
  --pr-url <url>     PR fake/real (default ${DEFAULT_PR})
  --webhook-only     Só POST defect-merge (exige secret); não PATCH manual
  --dry-run          Imprime passos sem HTTP
`)
      process.exit(0)
    } else {
      console.error(`Argumento desconhecido: ${a}`)
      process.exit(1)
    }
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

async function resolveDefect(consoleBase, args) {
  if (args.id) {
    const res = await fetch(`${consoleBase}/api/platform-defects/${encodeURIComponent(args.id)}`, {
      headers: opsHeaders(),
    })
    if (!res.ok) throw new Error(`detail ${res.status}`)
    const data = await res.json()
    return data.defect
  }
  const res = await fetch(
    `${consoleBase}/api/platform-defects/by-ref/${encodeURIComponent(args.ref)}`,
    { headers: opsHeaders() },
  )
  if (!res.ok) {
    const body = await res.text()
    throw new Error(`by-ref ${res.status}: ${body}`)
  }
  const data = await res.json()
  return data.item
}

function mergeWebhookPayload(ref, prUrl) {
  const baseRef = process.env.GITHUB_DEFECT_MERGE_BASE_REF?.trim() || 'main'
  return {
    action: 'closed',
    pull_request: {
      merged: true,
      html_url: prUrl,
      body: `${ref} · piloto QA-CYCLE smoke`,
      base: { ref: baseRef },
    },
  }
}

async function postMergeWebhook(consoleBase, payload) {
  const secret = process.env.GITHUB_DEFECT_MERGE_WEBHOOK_SECRET?.trim()
  if (!secret) return { skipped: true, reason: 'secret_not_configured' }
  const raw = JSON.stringify(payload)
  const sig = `sha256=${createHmac('sha256', secret).update(raw).digest('hex')}`
  const res = await fetch(`${consoleBase}/api/webhooks/github/defect-merge`, {
    method: 'POST',
    headers: { ...opsHeaders(), 'x-hub-signature-256': sig },
    body: raw,
  })
  const text = await res.text()
  let json
  try {
    json = text ? JSON.parse(text) : {}
  } catch {
    json = { raw: text }
  }
  return { status: res.status, ok: res.ok, json }
}

async function patchStatus(consoleBase, defectId, body) {
  const res = await fetch(`${consoleBase}/api/platform-defects/${encodeURIComponent(defectId)}/status`, {
    method: 'PATCH',
    headers: opsHeaders(),
    body: JSON.stringify(body),
  })
  const text = await res.text()
  let json
  try {
    json = text ? JSON.parse(text) : {}
  } catch {
    json = { raw: text }
  }
  return { status: res.status, ok: res.ok, json }
}

async function registerPr(consoleBase, defectId, prUrl) {
  const res = await fetch(
    `${consoleBase}/api/platform-defects/${encodeURIComponent(defectId)}/register-pr`,
    { method: 'POST', headers: opsHeaders(), body: JSON.stringify({ prUrl }) },
  )
  const text = await res.text()
  let json
  try {
    json = text ? JSON.parse(text) : {}
  } catch {
    json = { raw: text }
  }
  return { status: res.status, ok: res.ok, json }
}

async function main() {
  const args = parseArgs(process.argv)
  const consoleBase = resolveConsoleBase()
  if (args.dryRun) {
    console.log(
      JSON.stringify(
        {
          dryRun: true,
          consoleBase,
          ref: args.ref,
          prUrl: args.prUrl,
          webhookOnly: args.webhookOnly,
          steps: ['resolve_defect', 'register_pr?', 'ready_for_pr?', 'webhook_merge_or_manual_fixed'],
        },
        null,
        2,
      ),
    )
    return
  }
  const defect = await resolveDefect(consoleBase, args)
  if (!defect?.id) {
    console.error('Defeito não encontrado')
    process.exit(1)
  }

  if (defect.status === 'fixed') {
    console.log(
      JSON.stringify(
        { ok: true, idempotent: true, message: 'Defeito já fixed', defectId: defect.id, referenceCode: defect.referenceCode },
        null,
        2,
      ),
    )
    return
  }

  if (!defect.prUrl && args.prUrl) {
    const reg = await registerPr(consoleBase, defect.id, args.prUrl)
    if (!reg.ok && reg.status !== 409) {
      console.error(JSON.stringify({ step: 'register_pr', ...reg }, null, 2))
      process.exit(1)
    }
  }

  let current = defect
  if (current.status === 'open' || current.status === 'in_fix') {
    const prep = await patchStatus(consoleBase, defect.id, {
      status: 'ready_for_pr',
      prUrl: args.prUrl,
    })
    if (!prep.ok) {
      console.error(JSON.stringify({ step: 'ready_for_pr', ...prep }, null, 2))
      process.exit(1)
    }
    current = prep.json.item ?? current
  }

  const webhookPayload = mergeWebhookPayload(args.ref ?? current.referenceCode ?? 'DEF-000005', args.prUrl)
  const webhook = await postMergeWebhook(consoleBase, webhookPayload)
  if (webhook.skipped) {
    if (args.webhookOnly) {
      console.error(JSON.stringify({ error: 'webhook_disabled', ...webhook }, null, 2))
      process.exit(1)
    }
    const fixed = await patchStatus(consoleBase, defect.id, {
      status: 'fixed',
      prUrl: args.prUrl,
    })
    if (!fixed.ok) {
      console.error(JSON.stringify({ step: 'manual_fixed', ...fixed }, null, 2))
      process.exit(1)
    }
    console.log(
      JSON.stringify(
        {
          ok: true,
          path: 'manual_fixed',
          defectId: defect.id,
          referenceCode: defect.referenceCode,
          prUrl: args.prUrl,
          incidentsResolvedVia: 'onDefectFixed',
        },
        null,
        2,
      ),
    )
    return
  }

  if (!webhook.ok) {
    if (args.webhookOnly) {
      console.error(JSON.stringify({ step: 'webhook_merge', ...webhook }, null, 2))
      process.exit(1)
    }
    const fixed = await patchStatus(consoleBase, defect.id, {
      status: 'fixed',
      prUrl: args.prUrl,
    })
    if (!fixed.ok) {
      console.error(JSON.stringify({ step: 'webhook_failed_manual_fixed', webhook, fixed }, null, 2))
      process.exit(1)
    }
    console.log(
      JSON.stringify(
        {
          ok: true,
          path: 'webhook_failed_manual_fixed',
          webhookStatus: webhook.status,
          defectId: defect.id,
          referenceCode: defect.referenceCode,
        },
        null,
        2,
      ),
    )
    return
  }

  console.log(
    JSON.stringify(
      {
        ok: true,
        path: 'webhook_merge',
        webhookStatus: webhook.status,
        webhookBody: webhook.json,
        defectId: defect.id,
        referenceCode: defect.referenceCode,
        prUrl: args.prUrl,
      },
      null,
      2,
    ),
  )
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err)
  process.exit(1)
})
