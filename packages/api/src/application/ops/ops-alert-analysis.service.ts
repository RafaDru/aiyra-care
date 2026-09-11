import type { OpsAlert } from '../../domain/ops/ops-metrics.types.js'
import type { OpsAlertTriageRow } from '../../domain/ops/ops-alert-triage.js'
import type { OpsAlertAnalysisRecord } from '../../domain/ops/ops-alert-analysis.types.js'
import {
  emptyOpsAlertAnalysis,
  sanitizeOpsAlertAnalysisSummary,
  sanitizeOpsAlertOperatorNotes,
} from '../../domain/ops/ops-alert-analysis.types.js'
import {
  analysisErrorFromOpsInvestigatorResult,
  analysisStatusFromOpsInvestigatorResult,
  dispatchOpsAlertInvestigator,
  shouldAutoInvestigateOpsAlert,
} from './ops-alert-investigator-dispatch.js'
import type { OpsAlertAnalysisMemoryStore } from './ops-alert-analysis-memory.store.js'

const DEFAULT_INVESTIGATOR_COOLDOWN_MS = 30 * 60 * 1000

function investigatorCooldownMs(): number {
  const raw = process.env.OPS_ALERT_INVESTIGATOR_COOLDOWN_MS?.trim()
  const n = raw ? Number(raw) : DEFAULT_INVESTIGATOR_COOLDOWN_MS
  return Number.isFinite(n) && n > 0 ? n : DEFAULT_INVESTIGATOR_COOLDOWN_MS
}

function snapshotFromAlert(alert: OpsAlert): Pick<
  OpsAlertAnalysisRecord,
  'lastSeverity' | 'lastCategory' | 'lastMessage'
> {
  return {
    lastSeverity: alert.severity,
    lastCategory: alert.category,
    lastMessage: alert.message,
  }
}

export type RequestOpsAlertAnalysisResult =
  | { ok: true; analysisStatus: OpsAlertAnalysisRecord['analysisStatus']; message: string }
  | {
    ok: false
    error: 'not_found' | 'investigator_unavailable' | 'dispatch_failed' | 'cooldown'
    message: string
  }

export class OpsAlertAnalysisService {
  constructor(private readonly store: OpsAlertAnalysisMemoryStore) {}

  getAll(): Record<string, OpsAlertAnalysisRecord> {
    return this.store.getAll()
  }

  getForAlert(alertId: string): OpsAlertAnalysisRecord {
    return this.store.get(alertId)
  }

  async requestAnalysis(
    alert: OpsAlert,
    options: {
      triage?: OpsAlertTriageRow
      operatorNotes?: string
      trigger: 'auto' | 'manual'
      checkedAt: string
      respectCooldown?: boolean
    },
  ): Promise<RequestOpsAlertAnalysisResult> {
    const existing = this.store.get(alert.id)
    const notes = sanitizeOpsAlertOperatorNotes(options.operatorNotes) ?? existing.operatorNotes

    if (
      options.trigger === 'auto'
      && options.respectCooldown
      && !this.store.investigatorCooldownElapsed(alert.id, investigatorCooldownMs())
    ) {
      return { ok: false, error: 'cooldown', message: 'Investigador em cooldown para este alerta' }
    }

    const dispatch = await dispatchOpsAlertInvestigator(alert, {
      checkedAt: options.checkedAt,
      triage: options.triage,
      operatorNotes: notes,
      trigger: options.trigger,
    })

    const analysisStatus = analysisStatusFromOpsInvestigatorResult(dispatch)
    const analysisError = analysisErrorFromOpsInvestigatorResult(dispatch)
    const now = new Date().toISOString()

    const record: OpsAlertAnalysisRecord = {
      ...existing,
      alertId: alert.id,
      ...snapshotFromAlert(alert),
      operatorNotes: notes,
      analysisStatus,
      analysisLastError: analysisError,
      analysisRequestedAt: dispatch.outcome === 'sent' ? now : existing.analysisRequestedAt,
      analysisCompletedAt: dispatch.outcome === 'sent' ? null : existing.analysisCompletedAt,
    }
    this.store.save(record)

    if (dispatch.outcome === 'sent') {
      this.store.markInvestigatorSent(alert.id)
      return {
        ok: true,
        analysisStatus: 'in_progress',
        message: 'Investigador Cursor disparado — aguarde rascunho em docs/ops/investigations/',
      }
    }

    if (dispatch.outcome === 'skipped') {
      return {
        ok: false,
        error: 'investigator_unavailable',
        message: analysisError ?? 'Automação Cursor não configurada neste ambiente',
      }
    }

    return {
      ok: false,
      error: 'dispatch_failed',
      message: analysisError ?? 'Falha ao disparar investigador',
    }
  }

  async maybeAutoInvestigate(
    alerts: OpsAlert[],
    triage: OpsAlertTriageRow[],
    checkedAt: string,
  ): Promise<number> {
    let sent = 0
    for (const alert of alerts) {
      const row = triage.find((t) => t.alertId === alert.id)
      if (!shouldAutoInvestigateOpsAlert(alert, row)) continue
      const result = await this.requestAnalysis(alert, {
        triage: row,
        trigger: 'auto',
        checkedAt,
        respectCooldown: true,
      })
      if (result.ok) sent += 1
    }
    return sent
  }

  completeAnalysis(
    alertId: string,
    input: { analysisSummary?: string; analysisArtifactPath?: string },
  ): boolean {
    const summary = sanitizeOpsAlertAnalysisSummary(input.analysisSummary)
    const artifact = input.analysisArtifactPath?.trim().slice(0, 512) ?? null
    if (!summary && !artifact) return false

    const existing = this.store.get(alertId)
    this.store.save({
      ...(existing.alertId === alertId ? existing : emptyOpsAlertAnalysis(alertId)),
      alertId,
      analysisStatus: 'completed',
      analysisSummary: summary,
      analysisArtifactPath: artifact,
      analysisCompletedAt: new Date().toISOString(),
      analysisLastError: null,
    })
    return true
  }
}
