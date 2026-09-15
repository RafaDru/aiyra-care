import type { OpsAlert } from './ops-metrics.types.js'
import type { SupportReportRecord } from '../support-report/support-report.types.js'

export type InvestigationTier = 0 | 1

/** Paths permitidos em PR Tier 1 (prefix match). */
export const TIER1_PATH_ALLOWLIST = [
  'packages/api/src/infrastructure/',
  'packages/api/src/application/ops/',
  'packages/api/scripts/',
  'packages/connect/',
  'scripts/',
  'docs/ops/',
] as const

export const TIER1_MAX_CHANGED_FILES = 8
export const TIER1_MAX_CHANGED_LINES = 200

export function isTier1Enabled(): boolean {
  const raw = process.env.OPS_INVESTIGATOR_TIER1?.trim().toLowerCase()
  return raw === '1' || raw === 'true' || raw === 'on'
}

export function resolveSupportInvestigationTier(
  record: SupportReportRecord,
  trigger: 'auto' | 'manual',
): InvestigationTier {
  if (!isTier1Enabled()) return 0
  if (record.category !== 'technical_bug') return 0
  if (!record.consentTechnical) return 0
  // Tier 1 suporte: manual ou auto com bundle técnico
  return 1
}

export function resolveOpsAlertInvestigationTier(
  alert: OpsAlert,
  trigger: 'auto' | 'manual',
): InvestigationTier {
  if (!isTier1Enabled()) return 0
  if (alert.category !== 'infra' && alert.category !== 'sync') return 0
  if (trigger === 'auto' && alert.severity !== 'critical') return 0
  return 1
}

export function tier1PlaybookId(lane: 'development_support' | 'sre_support'): string {
  return lane === 'development_support' ? 'support-report-tier1' : 'ops-alert-tier1'
}
