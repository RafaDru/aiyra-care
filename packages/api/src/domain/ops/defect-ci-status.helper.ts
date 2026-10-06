import type { DefectPipelineStatus } from './platform-defect-pipeline.types.js'
import type { PlatformDefectRecord } from './platform-defect.types.js'

export type DefectCiStatusKind = 'green' | 'failed' | 'pending'

export const DEFECT_CI_STATUS_PT_LABEL: Record<DefectCiStatusKind, string> = {
  green: 'CI: verde',
  failed: 'CI: falhou',
  pending: 'CI: pendente',
}

export interface DefectCiStatusSnapshot {
  kind: DefectCiStatusKind
  label: string
  pipelineStatus: DefectPipelineStatus | null
  /** Compatível com `ciSnapshot.status` (agente / G3). */
  status: 'success' | 'failure' | 'pending' | 'unknown'
  conclusion: string | null
  runUrl: string | null
  failedJobs: string[]
}

function readStringField(obj: Record<string, unknown> | null | undefined, key: string): string | null {
  if (!obj) return null
  const v = obj[key]
  if (v == null) return null
  const s = String(v).trim()
  return s || null
}

function readFailedJobs(
  ...sources: Array<Record<string, unknown> | null | undefined>
): string[] {
  for (const src of sources) {
    const raw = src?.failedJobs
    if (!Array.isArray(raw)) continue
    const jobs = raw.map((j) => String(j).trim()).filter(Boolean)
    if (jobs.length) return jobs
  }
  return []
}

function conclusionFromSnapshot(snapshot: Record<string, unknown> | null | undefined): string | null {
  const conclusion = readStringField(snapshot, 'conclusion')
  if (conclusion) return conclusion.toLowerCase()
  const status = readStringField(snapshot, 'status')?.toLowerCase()
  if (status === 'success' || status === 'failure' || status === 'failed') return status
  return null
}

function kindFromPipeline(pipeline: DefectPipelineStatus | null): DefectCiStatusKind | null {
  if (!pipeline) return null
  if (pipeline === 'ci_success' || pipeline === 'approved_for_merge') return 'green'
  if (pipeline === 'ci_failed') return 'failed'
  if (pipeline === 'ci_pending' || pipeline === 'ci_running') {
    return 'pending'
  }
  return null
}

function kindFromConclusion(conclusion: string | null): DefectCiStatusKind | null {
  if (!conclusion) return null
  if (conclusion === 'success') return 'green'
  if (
    conclusion === 'failure'
    || conclusion === 'failed'
    || conclusion === 'timed_out'
    || conclusion === 'cancelled'
    || conclusion === 'action_required'
  ) {
    return 'failed'
  }
  if (conclusion === 'pending' || conclusion === 'in_progress' || conclusion === 'queued') {
    return 'pending'
  }
  return null
}

function machineStatusForKind(kind: DefectCiStatusKind): DefectCiStatusSnapshot['status'] {
  if (kind === 'green') return 'success'
  if (kind === 'failed') return 'failure'
  return 'pending'
}

/** Snapshot operador + agente a partir do defeito (pipeline 086 + último evento CI). */
export function deriveDefectCiStatusSnapshot(defect: PlatformDefectRecord): DefectCiStatusSnapshot {
  const pipeline = defect.pipelineStatus
  const lastCi = defect.lastCiSnapshot
  const failureDetails = defect.lastFailureDetails
  const conclusion =
    conclusionFromSnapshot(lastCi)
    ?? conclusionFromSnapshot(failureDetails)
    ?? (defect.lastFailureKind === 'ci' ? 'failure' : null)

  const failedJobs = readFailedJobs(failureDetails, lastCi)
  const runUrl = defect.lastCiRunUrl ?? readStringField(lastCi, 'runUrl') ?? readStringField(lastCi, 'html_url')

  const kind =
    kindFromPipeline(pipeline)
    ?? kindFromConclusion(conclusion)
    ?? (defect.lastFailureKind === 'ci' ? 'failed' : null)
    ?? 'pending'

  const status = machineStatusForKind(kind)
  return {
    kind,
    label: DEFECT_CI_STATUS_PT_LABEL[kind],
    pipelineStatus: pipeline,
    status,
    conclusion,
    runUrl,
    failedJobs,
  }
}

export function buildDefectCiSnapshotPayload(defect: PlatformDefectRecord): Record<string, unknown> {
  const derived = deriveDefectCiStatusSnapshot(defect)
  return {
    status: derived.status,
    conclusion: derived.conclusion,
    runUrl: derived.runUrl,
    pipelineStatus: derived.pipelineStatus,
    failedJobs: derived.failedJobs.length ? derived.failedJobs : undefined,
    ciStatus: { kind: derived.kind, label: derived.label },
    capturedAt: defect.lastCiCheckedAt ?? null,
    source: 'defect_pipeline',
  }
}

/** Prioriza dados do agente; completa com defeito e normaliza `ciStatus` / rótulo PT. */
export function mergeReviewCiSnapshot(
  defect: PlatformDefectRecord,
  agentSnapshot?: Record<string, unknown> | null,
): Record<string, unknown> {
  const fromDefect = buildDefectCiSnapshotPayload(defect)
  if (!agentSnapshot || typeof agentSnapshot !== 'object') {
    return fromDefect
  }

  const merged: Record<string, unknown> = { ...fromDefect, ...agentSnapshot }
  const agentStatus = readStringField(agentSnapshot, 'status')?.toLowerCase()
  const agentConclusion = readStringField(agentSnapshot, 'conclusion')?.toLowerCase()

  let kind: DefectCiStatusKind =
    kindFromConclusion(agentConclusion ?? null)
    ?? (agentStatus === 'success' ? 'green' : agentStatus === 'failure' || agentStatus === 'failed' ? 'failed' : null)
    ?? deriveDefectCiStatusSnapshot(defect).kind

  const nested = agentSnapshot.ciStatus
  if (nested && typeof nested === 'object' && nested !== null && 'kind' in nested) {
    const k = String((nested as { kind: unknown }).kind)
    if (k === 'green' || k === 'failed' || k === 'pending') kind = k
  }

  merged.status =
    agentStatus === 'success' || agentStatus === 'failure' || agentStatus === 'pending'
      ? agentStatus
      : machineStatusForKind(kind)
  if (agentConclusion) merged.conclusion = agentConclusion
  merged.ciStatus = { kind, label: DEFECT_CI_STATUS_PT_LABEL[kind] }
  if (!merged.pipelineStatus && fromDefect.pipelineStatus) {
    merged.pipelineStatus = fromDefect.pipelineStatus
  }
  if (!merged.runUrl && fromDefect.runUrl) merged.runUrl = fromDefect.runUrl
  const jobs = readFailedJobs(agentSnapshot, fromDefect as Record<string, unknown>)
  if (jobs.length) merged.failedJobs = jobs
  merged.source = 'merged_agent_defect'
  return merged
}

export function extractCiStatusLabelFromSnapshot(
  ciSnapshot: Record<string, unknown> | null | undefined,
): string | null {
  if (!ciSnapshot) return null
  const nested = ciSnapshot.ciStatus
  if (nested && typeof nested === 'object' && nested !== null && 'label' in nested) {
    const label = String((nested as { label: unknown }).label).trim()
    if (label) return label
  }
  const status = readStringField(ciSnapshot, 'status')?.toLowerCase()
  if (status === 'success') return DEFECT_CI_STATUS_PT_LABEL.green
  if (status === 'failure' || status === 'failed') return DEFECT_CI_STATUS_PT_LABEL.failed
  if (status === 'pending') return DEFECT_CI_STATUS_PT_LABEL.pending
  return null
}
