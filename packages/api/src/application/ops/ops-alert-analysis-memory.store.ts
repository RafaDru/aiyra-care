import type { OpsAlertAnalysisRecord } from '../../domain/ops/ops-alert-analysis.types.js'
import { emptyOpsAlertAnalysis } from '../../domain/ops/ops-alert-analysis.types.js'
import type { OpsAlertAnalysisStore } from './ops-alert-analysis.store.js'

/** Store em memória — testes e fallback sem PG. */
export class OpsAlertAnalysisMemoryStore implements OpsAlertAnalysisStore {
  private readonly records = new Map<string, OpsAlertAnalysisRecord>()
  private readonly investigatorCooldown = new Map<string, number>()

  async get(alertId: string): Promise<OpsAlertAnalysisRecord> {
    return this.records.get(alertId) ?? emptyOpsAlertAnalysis(alertId)
  }

  async listAll(): Promise<OpsAlertAnalysisRecord[]> {
    return [...this.records.values()]
  }

  async save(record: OpsAlertAnalysisRecord): Promise<void> {
    this.records.set(record.alertId, record)
  }

  async investigatorCooldownElapsed(
    alertId: string,
    cooldownMs: number,
    now = Date.now(),
  ): Promise<boolean> {
    const last = this.investigatorCooldown.get(alertId)
    return !last || now - last >= cooldownMs
  }

  async markInvestigatorSent(alertId: string, now = Date.now()): Promise<void> {
    this.investigatorCooldown.set(alertId, now)
  }
}

let singleton: OpsAlertAnalysisMemoryStore | undefined

export function getOpsAlertAnalysisMemoryStore(): OpsAlertAnalysisMemoryStore {
  if (!singleton) singleton = new OpsAlertAnalysisMemoryStore()
  return singleton
}

/** Testes — reset do singleton. */
export function resetOpsAlertAnalysisMemoryStore(): void {
  singleton = undefined
}
