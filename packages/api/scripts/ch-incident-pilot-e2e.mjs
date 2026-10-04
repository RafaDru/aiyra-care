#!/usr/bin/env node
/**
 * CH incident pilot — health + optional triage-started (zero LLM tokens).
 *
 * Usage:
 *   node packages/api/scripts/ch-incident-pilot-e2e.mjs
 *   node packages/api/scripts/ch-incident-pilot-e2e.mjs --incident-id <uuid> --triage-started
 *
 * Env: OPS_CONSOLE_HOST (default 127.0.0.1), OPS_CONSOLE_PORT (3013),
 *      OPS_INVESTIGATOR_CALLBACK_KEY or OPS_METRICS_KEY for triage-started POST.
 */
const host = process.env.OPS_CONSOLE_HOST?.trim() || '127.0.0.1'
const port = process.env.OPS_CONSOLE_PORT?.trim() || '3013'
const base = `http://${host}:${port}`

const args = process.argv.slice(2)
function flag(name) {
  const i = args.indexOf(name)
  if (i === -1) return undefined
  return args[i + 1]
}

const incidentId = flag('--incident-id')
const runTriageStarted = args.includes('--triage-started')

function callbackAuthHeaders() {
  const key =
    process.env.OPS_INVESTIGATOR_CALLBACK_KEY?.trim()
    || process.env.OPS_METRICS_KEY?.trim()
  if (!key) return null
  if (process.env.OPS_INVESTIGATOR_CALLBACK_KEY?.trim()) {
    return { 'x-investigator-callback-key': key }
  }
  return { 'x-internal-ops-key': key }
}

async function main() {
  console.log('CH incident pilot E2E (documentation + optional HTTP)\n')
  console.log(`Ops console: ${base}`)

  const healthRes = await fetch(`${base}/api/incident-dispatch/health`)
  const healthOk = healthRes.ok
  console.log(`\n1) GET /api/incident-dispatch/health → ${healthRes.status} ${healthOk ? 'OK' : 'FAIL'}`)
  if (healthOk) {
    const body = await healthRes.json()
    console.log('   lanes:', JSON.stringify(body.lanes ?? body, null, 2))
  }

  if (incidentId && runTriageStarted) {
    const headers = callbackAuthHeaders()
    if (!headers) {
      console.error('\n2) POST triage-started skipped — set OPS_INVESTIGATOR_CALLBACK_KEY or OPS_METRICS_KEY')
      process.exit(healthOk ? 0 : 1)
    }
    const url = `${base}/api/analysis-queue/${encodeURIComponent(incidentId)}/triage-started`
    const res = await fetch(url, { method: 'POST', headers })
    const text = await res.text()
    console.log(`\n2) POST ${url}`)
    console.log(`   → ${res.status} ${text}`)
  } else {
    console.log('\n2) POST triage-started (optional):')
    console.log('   node packages/api/scripts/ch-incident-pilot-e2e.mjs --incident-id <uuid> --triage-started')
  }

  console.log('\nManual Automation chain (notebook):')
  console.log('   a) Pick forwarded INC (e.g. INC-000007) in CH → copy investigationId')
  console.log('   b) Cursor Automation step 0: HTTP POST analysisQueue.triageStartedUrl from webhook payload')
  console.log('      Header: x-investigator-callback-key (same as callback)')
  console.log('   c) Agent step runs triage → POST analysisQueue.callbackUrl')
  console.log('   d) After PR #104 on main: DEF fixed → INC resolved (full chain to Resolvido)')
  console.log('\nMerge order if stacked PRs: #104 (resolved/recurrence) then triage-started PR.')

  process.exit(healthOk ? 0 : 1)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
