#!/usr/bin/env node
/**
 * Simula POST do agente regularização ambiente (infra_api_down).
 *
 * Uso: npm run ops:infra-env-regularization:simulate
 */
import { config } from 'dotenv'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'
import { randomUUID } from 'crypto'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
config({ path: resolve(root, '.env') })

function resolveDeploymentTier() {
  const raw = process.env.DEPLOYMENT_TIER?.trim().toLowerCase()
  if (raw === 'preview' || raw === 'production' || raw === 'integration') return raw
  return 'integration'
}

function resolveEnvironment() {
  const explicit = process.env.API_PUBLIC_URL?.trim()
  const apiPublicUrl = explicit
    ? explicit.replace(/\/$/, '')
    : `http://${process.env.API_PUBLIC_HOST?.trim() || '127.0.0.1'}:${process.env.PORT?.trim() || '3010'}`
  return { deploymentTier: resolveDeploymentTier(), apiPublicUrl }
}

function cleanKey(raw) {
  if (!raw) return ''
  let key = raw.replace(/^["']|["']$/g, '')
  key = key.replace(/^Authorization:\s*/i, '')
  key = key.replace(/^Bearer\s+/i, '')
  return key
}

const url = process.env.CURSOR_INFRA_ENV_REGULARIZATION_AUTOMATION_WEBHOOK_URL?.trim()
const bearerKey = cleanKey(process.env.CURSOR_INFRA_ENV_REGULARIZATION_AUTOMATION_WEBHOOK_KEY?.trim())
const machineHint = process.env.CURSOR_WORKER_NAME?.trim() || 'NotebookRafael'
const investigationId = randomUUID()
const alertId = 'infra_api_down'
const consolePort = process.env.OPS_CONSOLE_PORT?.trim() || '3013'
const consoleBase = `http://127.0.0.1:${consolePort}`
const callbackUrl = `${consoleBase}/api/analysis-queue/callback`
const triageStartedUrl = `${consoleBase}/api/analysis-queue/triage-started`

const sample = {
  type: 'ops_alert',
  investigationId,
  alertId,
  alert_kind: alertId,
  machineHint,
  agentRole: 'infra_env_regularization',
  severity: 'critical',
  category: 'infra',
  message: 'API health check failed (env regularization smoke)',
  details: { source: 'ops-infra-env-regularization-smoke' },
  triage: {
    alertId,
    severity: 'critical',
    category: 'infra',
    tier: 'infra',
    humanRequired: true,
    reason: 'smoke',
  },
  dashboardUrl: `${consoleBase}?tab=incidentes&investigationId=${investigationId}&alertId=${alertId}`,
  environment: resolveEnvironment(),
  checkedAt: new Date().toISOString(),
  text: `Regularização ambiente smoke [inv:${investigationId.slice(0, 8)}]`,
  investigation: { tier: 0, playbook: 'infra-env-regularization', trigger: 'manual' },
  analysisQueue: {
    id: investigationId,
    callbackUrl,
    triageStartedUrl,
    lane: 'infra_env_regularization',
  },
}

async function main() {
  console.log('ops-infra-env-regularization-simulate')
  console.log('machineHint:', machineHint)
  if (!url) {
    console.log('⚠️  CURSOR_INFRA_ENV_REGULARIZATION_AUTOMATION_WEBHOOK_URL não configurada.')
    console.log(JSON.stringify(sample, null, 2))
    process.exit(0)
  }
  const headers = { 'Content-Type': 'application/json' }
  if (bearerKey) headers.Authorization = `Bearer ${bearerKey}`
  const res = await fetch(url, { method: 'POST', headers, body: JSON.stringify(sample) })
  const text = await res.text()
  console.log(`HTTP ${res.status}`, text.slice(0, 500))
  process.exit(res.ok ? 0 : 1)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
