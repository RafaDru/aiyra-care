import type { OpsAlert } from '../ops/ops-metrics.types.js'
import type { SupportReportRecord } from '../support-report/support-report.types.js'

export type PreScreenOutcome = 'proceed' | 'dismiss' | 'defer'

export interface PreScreenResult {
  outcome: PreScreenOutcome
  reason: string
}

function isSmokeId(id: string): boolean {
  const lower = id.toLowerCase()
  return lower.startsWith('sim-') || lower.startsWith('sim_') || lower.includes('_sim_')
}

function smokeFingerprint(record: SupportReportRecord): boolean {
  const errors = record.diagnosticContext.recentClientErrors
  if (!Array.isArray(errors) || !errors.length) return false
  const first = errors[0] as Record<string, unknown> | undefined
  const fp = first?.fingerprint
  return typeof fp === 'string' && fp.toLowerCase().startsWith('sim_')
}

/** Regras leves antes de disparar agente (auto). Manual sempre segue. */
export function preScreenSupportReport(
  record: SupportReportRecord,
  trigger: 'auto' | 'manual',
): PreScreenResult {
  if (trigger === 'manual') {
    return { outcome: 'proceed', reason: 'manual_trigger' }
  }
  if (isSmokeId(record.id)) {
    return { outcome: 'dismiss', reason: 'smoke_test_report_id' }
  }
  if (smokeFingerprint(record)) {
    return { outcome: 'dismiss', reason: 'smoke_test_fingerprint' }
  }
  if (record.category === 'other' && !record.consentTechnical) {
    return { outcome: 'defer', reason: 'minimal_report_other_category' }
  }
  if (record.category === 'ux_confusion' && !record.consentTechnical) {
    return { outcome: 'defer', reason: 'ux_without_technical_bundle' }
  }
  return { outcome: 'proceed', reason: 'passed' }
}

export function preScreenOpsAlert(
  alert: OpsAlert,
  trigger: 'auto' | 'manual',
): PreScreenResult {
  if (trigger === 'manual') {
    return { outcome: 'proceed', reason: 'manual_trigger' }
  }
  if (isSmokeId(alert.id)) {
    return { outcome: 'dismiss', reason: 'smoke_test_alert_id' }
  }
  const source = alert.details?.source
  if (typeof source === 'string' && source.includes('smoke')) {
    return { outcome: 'dismiss', reason: 'smoke_test_details' }
  }
  return { outcome: 'proceed', reason: 'passed' }
}

export function isPreScreenEnabled(): boolean {
  const raw = process.env.OPS_ANALYSIS_PRE_SCREEN?.trim().toLowerCase()
  if (raw === '0' || raw === 'false' || raw === 'off') return false
  return true
}
