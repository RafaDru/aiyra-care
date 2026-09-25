import type { Pool } from 'pg'
import type { OpsAnalysisQueueRecord } from '../../domain/ops/ops-analysis-queue.types.js'
import type { OpsAlert } from '../../domain/ops/ops-metrics.types.js'
import type { OpsAlertTriageRow } from '../../domain/ops/ops-alert-triage.js'
import { buildIncidentDispatchIdempotencyKey } from '../../domain/ops/incident-pipeline-status.js'
import type { SupportReportRecord } from '../../domain/support-report/support-report.types.js'
import {
  resolveOpsAlertInvestigationTier,
  resolveSupportInvestigationTier,
} from '../../domain/ops/investigator-tier.js'
import { resolveInvestigatorCallbackUrl } from './ops-analysis-callback-url.js'
import {
  dispatchOpsAlertInvestigator,
  type OpsAlertInvestigatorDispatchResult,
} from './ops-alert-investigator-dispatch.js'
import {
  dispatchSupportReportInvestigator,
  type SupportInvestigatorDispatchResult,
} from '../support-report/support-report-dispatch.js'
import { IncidentDispatchOutboxPgRepository } from '../../infrastructure/persistence/incident-dispatch-outbox.pg.repository.js'
import { OpsAnalysisQueuePgRepository } from '../../infrastructure/persistence/ops-analysis-queue.pg.repository.js'
import { SupportReportPgRepository } from '../../infrastructure/persistence/support-report.pg.repository.js'
import {
  buildOpsAlertDispatchPayload,
  buildSupportReportDispatchPayload,
  isQueueRecordEligibleForDispatchReconcile,
  isSupportBatchQueueRecord,
  opsAlertFromQueueRecord,
  supportDispatchOptionsFromQueue,
} from './incident-dispatch-payload.helper.js'

const DISPATCH_KIND = 'triage_v1'
const MAX_OUTBOX_ATTEMPTS = 8

let lastReconcileAtMs = 0

export function reconcileIntervalMs(): number {
  const raw = process.env.CH_INCIDENT_RECONCILE_INTERVAL_MS?.trim()
  const n = raw ? Number(raw) : 60_000
  return Number.isFinite(n) && n > 0 ? n : 60_000
}

export function openIncidentStaleMs(): number {
  const raw = process.env.CH_INCIDENT_OPEN_STALE_MS?.trim()
  const n = raw ? Number(raw) : 300_000
  return Number.isFinite(n) && n >= 0 ? n : 300_000
}

export type ReconcileOpenIncidentsResult = {
  scanned: number
  enqueued: number
  reset: number
  skipped: number
}

export type BackfillOpenIncidentsResult = ReconcileOpenIncidentsResult

export function createIncidentDispatchService(pool: Pool): IncidentDispatchService {
  return new IncidentDispatchService(
    new IncidentDispatchOutboxPgRepository(pool),
    new OpsAnalysisQueuePgRepository(pool),
    new SupportReportPgRepository(pool),
  )
}

export class IncidentDispatchService {
  constructor(
    private readonly outbox: IncidentDispatchOutboxPgRepository,
    private readonly queueRepo: OpsAnalysisQueuePgRepository,
    private readonly supportRepo: SupportReportPgRepository,
  ) {}

  async dispatchSupportTriage(
    record: SupportReportRecord,
    incidentId: string,
    options: { operatorNotes?: string | null; trigger: 'auto' | 'manual' },
  ): Promise<SupportInvestigatorDispatchResult> {
    const callbackUrl = resolveInvestigatorCallbackUrl()
    const investigationTier = resolveSupportInvestigationTier(record, options.trigger)
    const idempotencyKey = buildIncidentDispatchIdempotencyKey(incidentId, DISPATCH_KIND)

    const outboxRow =
      (await this.outbox.insertIfAbsent({
        incidentId,
        idempotencyKey,
        payload: {
          kind: 'support_report_triage_v1',
          sourceId: record.id,
          trigger: options.trigger,
          operatorNotes: options.operatorNotes ?? null,
          callbackUrl,
          investigationTier,
        },
      })) ?? (await this.outbox.findByIdempotencyKey(idempotencyKey))

    const dispatch = await dispatchSupportReportInvestigator(record, {
      operatorNotes: options.operatorNotes,
      trigger: options.trigger,
      analysisQueue: { id: incidentId, callbackUrl },
      investigationTier,
    })

    if (outboxRow) {
      await this.applyDispatchResult(outboxRow.id, incidentId, dispatch)
    }
    return dispatch
  }

  async dispatchOpsAlertTriage(
    alert: OpsAlert,
    incidentId: string,
    options: {
      checkedAt: string
      triage?: OpsAlertTriageRow
      operatorNotes?: string | null
      trigger: 'auto' | 'manual'
    },
  ): Promise<OpsAlertInvestigatorDispatchResult> {
    const callbackUrl = resolveInvestigatorCallbackUrl()
    const investigationTier = resolveOpsAlertInvestigationTier(alert, options.trigger)
    const idempotencyKey = buildIncidentDispatchIdempotencyKey(incidentId, DISPATCH_KIND)

    const outboxRow =
      (await this.outbox.insertIfAbsent({
        incidentId,
        idempotencyKey,
        payload: {
          kind: 'ops_alert_triage_v1',
          alert,
          checkedAt: options.checkedAt,
          triage: options.triage ?? null,
          trigger: options.trigger,
          operatorNotes: options.operatorNotes ?? null,
          callbackUrl,
          investigationTier,
        },
      })) ?? (await this.outbox.findByIdempotencyKey(idempotencyKey))

    const dispatch = await dispatchOpsAlertInvestigator(alert, {
      ...options,
      analysisQueue: { id: incidentId, callbackUrl },
      investigationTier,
    })

    if (outboxRow) {
      await this.applyDispatchResult(outboxRow.id, incidentId, dispatch)
    }
    return dispatch
  }

  private async applyDispatchResult(
    outboxId: string,
    incidentId: string,
    dispatch: SupportInvestigatorDispatchResult | OpsAlertInvestigatorDispatchResult,
  ): Promise<void> {
    if (dispatch.outcome === 'sent') {
      await this.outbox.markForwarded(outboxId)
      await this.queueRepo.setIncidentPipelineStatus(incidentId, 'forwarded')
      return
    }
    if (dispatch.outcome === 'failed') {
      await this.outbox.bumpAttempt(outboxId, dispatch.error)
      return
    }
    if (dispatch.outcome === 'skipped') {
      const reason =
        'reason' in dispatch && typeof dispatch.reason === 'string'
          ? dispatch.reason
          : 'skipped'
      await this.outbox.bumpAttempt(outboxId, `skipped:${reason}`)
    }
  }

  async buildDispatchPayloadForQueueRecord(
    record: OpsAnalysisQueueRecord,
  ): Promise<Record<string, unknown> | null> {
    if (!isQueueRecordEligibleForDispatchReconcile(record)) return null
    if (isSupportBatchQueueRecord(record)) return null

    if (record.sourceType === 'support_report') {
      const support = await this.supportRepo.findByIdForOps(record.sourceId)
      if (!support) return null
      return buildSupportReportDispatchPayload(support, supportDispatchOptionsFromQueue(record))
    }

    if (record.sourceType === 'ops_alert') {
      const alert = opsAlertFromQueueRecord(record)
      if (!alert) return null
      return buildOpsAlertDispatchPayload(record, alert)
    }

    return null
  }

  async ensureOutboxForQueueRecord(
    record: OpsAnalysisQueueRecord,
  ): Promise<'inserted' | 'reset' | 'exists' | 'skipped' | 'terminal_dead'> {
    if (!isQueueRecordEligibleForDispatchReconcile(record)) return 'skipped'

    const idempotencyKey = buildIncidentDispatchIdempotencyKey(record.id, DISPATCH_KIND)
    const existing = await this.outbox.findByIdempotencyKey(idempotencyKey)

    if (existing && ['pending', 'forwarded', 'claimed'].includes(existing.status)) {
      return 'exists'
    }
    if (existing?.status === 'dead' && existing.attemptCount >= MAX_OUTBOX_ATTEMPTS) {
      return 'terminal_dead'
    }

    const payload = await this.buildDispatchPayloadForQueueRecord(record)
    if (!payload) return 'skipped'

    if (!existing) {
      const inserted = await this.outbox.insertIfAbsent({
        incidentId: record.id,
        idempotencyKey,
        payload,
      })
      return inserted ? 'inserted' : 'exists'
    }

    await this.outbox.resetToPending(existing.id, payload)
    return 'reset'
  }

  async reconcileOpenIncidents(
    limit = 50,
    options?: { staleOnly?: boolean },
  ): Promise<ReconcileOpenIncidentsResult> {
    const staleOnly = options?.staleOnly ?? true
    const staleMs = staleOnly ? openIncidentStaleMs() : undefined
    const rows = await this.queueRepo.listOpenNeedingDispatchOutbox(limit, { staleMs })
    const result: ReconcileOpenIncidentsResult = {
      scanned: rows.length,
      enqueued: 0,
      reset: 0,
      skipped: 0,
    }

    for (const row of rows) {
      const outcome = await this.ensureOutboxForQueueRecord(row)
      if (outcome === 'inserted') result.enqueued += 1
      else if (outcome === 'reset') result.reset += 1
      else result.skipped += 1
    }

    return result
  }

  async backfillOpenIncidents(limit = 500): Promise<BackfillOpenIncidentsResult> {
    return this.reconcileOpenIncidents(limit, { staleOnly: false })
  }

  async runWorkerTick(
    batchLimit = 20,
    reconcileLimit = 50,
  ): Promise<{
    reconcile?: ReconcileOpenIncidentsResult
    batch: { processed: number; sent: number; failed: number; dead: number; skipped: number }
  }> {
    const now = Date.now()
    let reconcile: ReconcileOpenIncidentsResult | undefined
    if (now - lastReconcileAtMs >= reconcileIntervalMs()) {
      reconcile = await this.reconcileOpenIncidents(reconcileLimit, { staleOnly: true })
      lastReconcileAtMs = now
    }
    const batch = await this.processOutboxBatch(batchLimit)
    return { reconcile, batch }
  }

  async processOutboxBatch(
    limit = 20,
  ): Promise<{ processed: number; sent: number; failed: number; dead: number; skipped: number }> {
    const rows = await this.outbox.listPending(limit)
    let processed = 0
    let sent = 0
    let failed = 0
    let dead = 0
    let skipped = 0

    for (const row of rows) {
      if (row.attemptCount >= MAX_OUTBOX_ATTEMPTS) {
        await this.outbox.markDead(row.id, 'max_attempts')
        console.warn(
          `[incident-dispatch] outbox dead incident=${row.incidentId} attempts=${row.attemptCount}`,
        )
        dead += 1
        failed += 1
        continue
      }

      const claimed = await this.outbox.claim(row.id)
      if (!claimed) continue

      processed += 1
      await this.queueRepo.setIncidentPipelineStatus(row.incidentId, 'queued_worker')

      const payload = row.payload
      const kind = payload.kind

      try {
        let dispatch: SupportInvestigatorDispatchResult | OpsAlertInvestigatorDispatchResult
        if (kind === 'support_report_triage_v1' && typeof payload.sourceId === 'string') {
          const record = await this.supportRepo.findByIdForOps(payload.sourceId)
          if (!record) {
            await this.outbox.bumpAttempt(row.id, 'support_report_not_found')
            failed += 1
            continue
          }
          dispatch = await dispatchSupportReportInvestigator(record, {
            operatorNotes: typeof payload.operatorNotes === 'string' ? payload.operatorNotes : null,
            trigger: payload.trigger === 'manual' ? 'manual' : 'auto',
            analysisQueue: {
              id: row.incidentId,
              callbackUrl: String(payload.callbackUrl ?? resolveInvestigatorCallbackUrl()),
            },
            investigationTier: (payload.investigationTier as 0 | 1) ?? 0,
          })
        } else if (kind === 'ops_alert_triage_v1' && payload.alert && typeof payload.alert === 'object') {
          const alert = payload.alert as OpsAlert
          dispatch = await dispatchOpsAlertInvestigator(alert, {
            checkedAt: String(payload.checkedAt ?? new Date().toISOString()),
            triage: payload.triage as OpsAlertTriageRow | undefined,
            operatorNotes: typeof payload.operatorNotes === 'string' ? payload.operatorNotes : null,
            trigger: payload.trigger === 'manual' ? 'manual' : 'auto',
            analysisQueue: {
              id: row.incidentId,
              callbackUrl: String(payload.callbackUrl ?? resolveInvestigatorCallbackUrl()),
            },
            investigationTier: (payload.investigationTier as 0 | 1) ?? 0,
          })
        } else {
          await this.outbox.bumpAttempt(row.id, 'unknown_outbox_kind')
          failed += 1
          continue
        }

        if (dispatch.outcome === 'sent') {
          await this.outbox.markForwarded(row.id)
          await this.queueRepo.setIncidentPipelineStatus(row.incidentId, 'forwarded')
          await this.queueRepo.markInvestigating(row.incidentId)
          sent += 1
        } else if (dispatch.outcome === 'failed') {
          await this.outbox.bumpAttempt(row.id, dispatch.error)
          failed += 1
        } else if (dispatch.outcome === 'skipped') {
          await this.outbox.bumpAttempt(row.id, `skipped:${dispatch.reason}`)
          skipped += 1
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : 'dispatch_error'
        await this.outbox.bumpAttempt(row.id, message)
        failed += 1
      }
    }

    return { processed, sent, failed, dead, skipped }
  }
}
