#!/usr/bin/env node
/**
 * Simula POST do investigador de alertas ops (Cursor Automation webhook).
 *
 * Uso: node scripts/ops-alert-investigator-simulate.mjs
 */
import { config } from 'dotenv'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'
import { randomUUID } from 'crypto'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
config({ path: resolve(root, '.env') })
config({ path: resolve(root, '.env.preview'), override: false })

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
  key = key.replace(/^Authorization\s+/i, '')
  key = key.replace(/^Bearer\s+/i, '')
  return key
}

const dedicatedUrl = process.env.CURSOR_SRE_SUPPORT_AUTOMATION_WEBHOOK_URL?.trim()
  || process.env.CURSOR_OPS_ALERT_AUTOMATION_WEBHOOK_URL?.trim()
const investigatorUrl = dedicatedUrl
  || process.env.CURSOR_DEVELOPMENT_SUPPORT_AUTOMATION_WEBHOOK_URL?.trim()
  || process.env.CURSOR_SUPPORT_AUTOMATION_WEBHOOK_URL?.trim()
const dedicatedKey = cleanKey(process.env.CURSOR_SRE_SUPPORT_AUTOMATION_WEBHOOK_KEY?.trim())
  || cleanKey(process.env.CURSOR_OPS_ALERT_AUTOMATION_WEBHOOK_KEY?.trim())
const investigatorKey = dedicatedKey
  || (dedicatedUrl
    ? undefined
    : cleanKey(process.env.CURSOR_DEVELOPMENT_SUPPORT_AUTOMATION_WEBHOOK_KEY?.trim())
      || cleanKey(process.env.CURSOR_SUPPORT_AUTOMATION_WEBHOOK_KEY?.trim()))

const investigationId = randomUUID()
const alertId = `sim_infra_api_down_${Date.now().toString(36)}`
const consolePort = process.env.OPS_CONSOLE_PORT?.trim() || '3013'
const consoleBase = `http://127.0.0.1:${consolePort}`
const callbackUrl = `${consoleBase}/api/analysis-queue/callback`
const dashboardUrl = `${consoleBase}?tab=issues&investigationId=${investigationId}&alertId=${alertId}`

const sample = {
  type: 'ops_alert',
  investigationId,
  alertId,
  severity: 'critical',
  category: 'infra',
  message: 'API health check failed (smoke test)',
  details: { source: 'ops-alert-investigator-smoke' },
  triage: {
    alertId,
    severity: 'critical',
    category: 'infra',
    tier: 'infra',
    humanRequired: true,
    reason: 'smoke',
  },
  dashboardUrl,
  environment: resolveEnvironment(),
  checkedAt: new Date().toISOString(),
  text: `Alerta ops smoke [inv:${investigationId.slice(0, 8)}]`,
  investigation: { tier: 0, playbook: 'ops-alert-tier0', trigger: 'manual' },
  analysisQueue: {
    id: investigationId,
    callbackUrl,
    lane: 'sre_support',
  },
}

async function post(label, url, body, bearerKey) {
  if (!url) {
    console.log(`⏭️  ${label}: URL não configurada`)
    return false
  }
  try {
    const headers = { 'Content-Type': 'application/json' }
    if (bearerKey) headers.Authorization = `Bearer ${bearerKey}`
    const res = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
    })
    const text = await res.text()
    if (!res.ok) {
      console.error(`❌ ${label}: HTTP ${res.status} — ${text}`)
      return false
    }
    console.log(`✅ ${label}: ${res.status} ${text || 'ok'}`)
    return true
  } catch (err) {
    console.error(`❌ ${label}:`, err instanceof Error ? err.message : err)
    return false
  }
}

console.log('ops-alert-investigator-simulate')
console.log('  investigationId:', investigationId)
console.log('  alertId:', alertId)
console.log(
  '  webhook:',
  dedicatedUrl ? 'CURSOR_SRE_SUPPORT_AUTOMATION_WEBHOOK_URL' : 'CURSOR_DEVELOPMENT_SUPPORT_* (fallback)',
)
console.log('')

const ok = await post('Cursor Automation', investigatorUrl, sample, investigatorKey)

if (!dedicatedUrl) {
  console.log('')
  console.log('⚠️  CURSOR_SRE_SUPPORT_AUTOMATION_WEBHOOK_URL não configurada.')
  console.log('   O payload ops_alert foi enviado para a URL de Suporte Desenvolvimento.')
  console.log('   Configure a lane Suporte SRE: CURSOR_SRE_SUPPORT_AUTOMATION_WEBHOOK_URL')
}

process.exit(ok ? 0 : 1)
