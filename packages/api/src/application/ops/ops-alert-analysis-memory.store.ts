import type { OpsAlertAnalysisRecord } from '../../domain/ops/ops-alert-analysis.types.js'
import { emptyOpsAlertAnalysis } from '../../domain/ops/ops-alert-analysis.types.js'

/** Estado de análise em memória (Fase A — não persiste em PG). */
export class OpsAlertAnalysisMemoryStore {
  private readonly records = new Map<string, OpsAlertAnalysisRecord>()
  private readonly investigatorCooldown = new Map<string, number>()

  get(alertId: string): OpsAlertAnalysisRecord {
    return this.records.get(alertId) ?? emptyOpsAlertAnalysis(alertId)
  }

  getAll(): Record<string, OpsAlertAnalysisRecord> {
    const out: Record<string, OpsAlertAnalysisRecord> = {}
    for (const [id, row] of this.records) out[id] = row
    return out
  }

  save(record: OpsAlertAnalysisRecord): void {
    this.records.set(record.alertId, record)
  }

  investigatorCooldownElapsed(alertId: string, cooldownMs: number, now = Date.now()): boolean {
    const last = this.investigatorCooldown.get(alertId)
    return !last || now - last >= cooldownMs
  }

  markInvestigatorSent(alertId: string, now = Date.now()): void {
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
