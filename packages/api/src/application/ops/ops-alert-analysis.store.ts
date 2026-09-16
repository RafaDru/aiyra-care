import type { OpsAlertAnalysisRecord } from '../../domain/ops/ops-alert-analysis.types.js'

export interface OpsAlertAnalysisStore {
  get(alertId: string): Promise<OpsAlertAnalysisRecord>
  listAll(): Promise<OpsAlertAnalysisRecord[]>
  save(record: OpsAlertAnalysisRecord): Promise<void>
  investigatorCooldownElapsed(alertId: string, cooldownMs: number, now?: number): Promise<boolean>
  markInvestigatorSent(alertId: string, now?: number): Promise<void>
}
