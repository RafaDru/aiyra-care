#!/usr/bin/env node
/**
 * Simula POST do investigador (Cursor Automation webhook) e/ou notificador local.
 *
 * Uso:
 *   node scripts/support-investigator-simulate.mjs
 *   CURSOR_DEVELOPMENT_SUPPORT_AUTOMATION_WEBHOOK_URL=https://... node scripts/support-investigator-simulate.mjs
 */
import { config } from 'dotenv'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'
import { readFileSync } from 'fs'

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

const sample = {
  type: 'support_report',
  reportId: 'sim-' + Date.now().toString(36),
  category: 'technical_bug',
  route: '/patients/demo',
  consentTechnical: true,
  consentProfileAccess: false,
  topFingerprint: 'sim_fingerprint_sync_timeout',
  dashboardUrl: 'http://127.0.0.1:3013?tab=support',
  environment: resolveEnvironment(),
  submittedAt: new Date().toISOString(),
  text: 'Novo chamado: Bug técnico — /patients/demo',
  toast: {
    title: 'AiyraCare | Novo chamado',
    body: 'Bug técnico\n/patients/demo\nErro: sim_fingerprint_sync_timeout',
    icon: 'info',
  },
  investigation: { tier: 0, playbook: 'support-report-tier0' },
}

async function post(label, url, body, bearerKey) {
  if (!url) {
    console.log(`⏭️  ${label}: URL não configurada`)
    return false
  }
  try {
    const headers = { 'Content-Type': 'application/json' }
    if (bearerKey) {
      let key = bearerKey.replace(/^["']|["']$/g, '')
      key = key.replace(/^Authorization:\s*/i, '')
      key = key.replace(/^Authorization\s+/i, '')
      key = key.replace(/^Bearer\s+/i, '')
      headers.Authorization = `Bearer ${key}`
    }
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

const notifierUrl = process.env.SUPPORT_REPORT_WEBHOOK_URL?.trim()
  || process.env.OPS_ALERT_WEBHOOK_URL?.trim()
const investigatorUrl = process.env.CURSOR_DEVELOPMENT_SUPPORT_AUTOMATION_WEBHOOK_URL?.trim()
  || process.env.CURSOR_SUPPORT_AUTOMATION_WEBHOOK_URL?.trim()
const investigatorKey = process.env.CURSOR_DEVELOPMENT_SUPPORT_AUTOMATION_WEBHOOK_KEY?.trim()
  || process.env.CURSOR_SUPPORT_AUTOMATION_WEBHOOK_KEY?.trim()

console.log('support-investigator-simulate')
console.log('  reportId:', sample.reportId)
console.log('')

const notifierOk = await post('Notificador local', notifierUrl, sample)
const investigatorOk = await post(
  'Cursor Automation',
  investigatorUrl,
  sample,
  investigatorKey,
)

if (investigatorUrl && !investigatorKey) {
  console.log('')
  console.log('⚠️  Falta CURSOR_DEVELOPMENT_SUPPORT_AUTOMATION_WEBHOOK_KEY no .env')
  console.log('   Na Automation → trigger Webhook → «Generate auth header» / «Copy auth header»')
  console.log('   Cole só o token crsr_... (sem prefixo Bearer)')
}

if (!investigatorUrl) {
  console.log('')
  console.log('Para validar o agente:')
  console.log('  1. Cursor → Automations → criar webhook (ver docs/ops/SUPPORT_INVESTIGATOR_AUTOMATION.md)')
  console.log('  2. Cole a URL em .env: CURSOR_DEVELOPMENT_SUPPORT_AUTOMATION_WEBHOOK_URL=<url>')
  console.log('  3. Rode este script de novo')
}

const workflowPath = resolve(root, 'docs/ops/automations/support-report-investigator.workflow.json')
try {
  JSON.parse(readFileSync(workflowPath, 'utf8'))
  console.log('')
  console.log('Prefill workflow OK:', workflowPath)
} catch {
  console.warn('Workflow prefill missing or invalid:', workflowPath)
}

process.exit(notifierOk || investigatorOk ? 0 : 1)
