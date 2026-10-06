import type { PlatformDefectItem, PlatformDefectStatus } from './ops.types.js'
import type { OpsAnalysisQueueItem } from './ops.types.js'
import { defectReviewRowBadge } from './ch-defect-display.js'

export type ChPipelineStepState = 'done' | 'current' | 'pending' | 'failed'

export interface ChPipelineStep {
  key: string
  label: string
  state: ChPipelineStepState
  at?: string | null
  hint?: string
}

export interface ChRowBadge {
  label: string
  color: string
}

const PIPELINE_STATUS_LABEL: Record<string, string> = {
  ci_pending: 'CI pendente',
  ci_running: 'CI em execução',
  ci_failed: 'CI falhou',
  ci_success: 'CI ok',
  review_pending: 'Review pendente',
  review_failed: 'Review reprovou',
  approved_for_merge: 'Aprovado p/ merge',
}

export function humanizeDefectPipelineStatus(value: string | null | undefined): string {
  if (!value) return '—'
  return PIPELINE_STATUS_LABEL[value] ?? value
}

export function defectPipelineCiRowBadge(item: PlatformDefectItem): ChRowBadge | null {
  const showCi =
    item.status === 'ready_for_pr'
    || (item.status === 'in_fix' && item.lastFailureKind === 'ci')
    || item.status === 'fixed'
  if (!showCi) return null

  const pipeline = item.pipelineStatus
  if (item.lastFailureKind === 'ci' || pipeline === 'ci_failed') {
    return { label: 'CI ✗', color: 'error' }
  }
  if (pipeline === 'ci_success' || pipeline === 'approved_for_merge') {
    return { label: 'CI ✓', color: 'success' }
  }
  if (pipeline === 'ci_running' || pipeline === 'ci_pending') {
    return { label: 'CI …', color: 'processing' }
  }
  if (item.status === 'ready_for_pr') {
    return { label: 'CI', color: 'default' }
  }
  return null
}

export function defectPipelineReviewRowBadge(item: PlatformDefectItem): ChRowBadge | null {
  return defectReviewRowBadge(item)
}

export function defectPipelineStatusRowBadge(item: PlatformDefectItem): ChRowBadge | null {
  if (item.status !== 'ready_for_pr' && item.status !== 'fixed') return null
  if (!item.pipelineStatus) return null
  if (item.pipelineStatus.startsWith('ci_')) return null
  const color =
    item.pipelineStatus === 'approved_for_merge'
      ? 'success'
      : item.pipelineStatus === 'review_failed'
        ? 'error'
        : 'processing'
  return {
    label: humanizeDefectPipelineStatus(item.pipelineStatus),
    color,
  }
}

export function extractCiFailedJobs(item: PlatformDefectItem): string[] {
  const raw = item.lastFailureDetails?.failedJobs
  if (!Array.isArray(raw)) return []
  return raw.map(String).filter(Boolean)
}

export function formatCiFailureSummary(item: PlatformDefectItem): string | null {
  if (item.lastFailureSummary) return item.lastFailureSummary
  const jobs = extractCiFailedJobs(item)
  if (jobs.length > 0) return `Jobs: ${jobs.join(', ')}`
  return null
}

export function defectShowCiFailureBanner(item: PlatformDefectItem): boolean {
  return item.status === 'in_fix' && item.lastFailureKind === 'ci'
}

export function defectShowReviewFailureBanner(item: PlatformDefectItem): boolean {
  return (
    item.status === 'ready_for_pr'
    && (item.pipelineStatus === 'review_failed'
      || item.latestReview?.recommendation === 'block'
      || item.latestReview?.recommendation === 'request_changes')
  )
}

export function buildDefectCycleSteps(item: PlatformDefectItem): ChPipelineStep[] {
  const status = item.status
  const reviewDone = item.latestReview?.status === 'completed'
  const reviewRec = item.latestReview?.recommendation
  const merged = status === 'fixed' || Boolean(item.mergedAt)

  const stepState = (
    done: boolean,
    failed: boolean,
    current: boolean,
  ): ChPipelineStepState => {
    if (failed) return 'failed'
    if (done) return 'done'
    if (current) return 'current'
    return 'pending'
  }

  const detectedDone = true
  const inFixDone = Boolean(item.fixStartedAt) || status === 'ready_for_pr' || status === 'fixed'
  const readyDone = Boolean(item.readyForPrAt) || status === 'ready_for_pr' || status === 'fixed'
  const ciFailed = item.lastFailureKind === 'ci' || item.pipelineStatus === 'ci_failed'
  const ciDone =
    item.pipelineStatus === 'ci_success'
    || item.pipelineStatus === 'approved_for_merge'
    || merged
  const reviewFailed =
    item.pipelineStatus === 'review_failed'
    || reviewRec === 'block'
    || reviewRec === 'request_changes'
  const reviewDoneStep = reviewDone && !reviewFailed

  const currentIsInFix = status === 'in_fix' && !readyDone
  const currentIsReady = status === 'ready_for_pr' && !merged

  return [
    {
      key: 'detected',
      label: 'Detectado',
      state: stepState(detectedDone, false, status === 'open'),
      at: item.firstSeenAt,
    },
    {
      key: 'in_fix',
      label: 'Em correção',
      state: stepState(inFixDone, false, currentIsInFix),
      at: item.fixStartedAt,
    },
    {
      key: 'ready_for_pr',
      label: 'Pronto PR',
      state: stepState(readyDone, false, currentIsReady && !item.prUrl),
      at: item.readyForPrAt,
    },
    {
      key: 'ci',
      label: 'CI',
      state: stepState(ciDone, ciFailed && !merged, currentIsReady && Boolean(item.prUrl) && !ciDone && !ciFailed),
      at: item.lastCiCheckedAt ?? null,
      hint: item.pipelineStatus ? humanizeDefectPipelineStatus(item.pipelineStatus) : undefined,
    },
    {
      key: 'review',
      label: 'Review',
      state: stepState(reviewDoneStep, reviewFailed && !merged, currentIsReady && ciDone && !reviewDoneStep && !reviewFailed),
      at: item.latestReview?.completedAt ?? null,
      hint: reviewRec ? reviewRec : item.latestReview?.status,
    },
    {
      key: 'merge',
      label: 'Merge',
      state: stepState(merged, false, currentIsReady && reviewDoneStep && !merged),
      at: item.mergedAt ?? item.fixedAt,
    },
  ]
}

export function buildIncidentCycleSteps(row: OpsAnalysisQueueItem): ChPipelineStep[] {
  const pipeline = row.incidentPipelineStatus ?? 'open'
  const linked = (row.linkedDefects?.length ?? 0) > 0
  const resolved = pipeline === 'resolved'
  const dismissed = pipeline === 'dismissed'
  const triaged = pipeline === 'triaged' || resolved

  const stepState = (
    done: boolean,
    failed: boolean,
    current: boolean,
  ): ChPipelineStepState => {
    if (failed) return 'failed'
    if (done) return 'done'
    if (current) return 'current'
    return 'pending'
  }

  const dispatchFailed = pipeline === 'dispatch_failed'

  return [
    {
      key: 'open',
      label: 'INC aberto',
      state: stepState(true, false, pipeline === 'open' || pipeline === 'forwarded'),
      at: row.createdAt,
    },
    {
      key: 'triage',
      label: 'Triagem',
      state: stepState(
        triaged || pipeline === 'in_triage',
        dispatchFailed,
        pipeline === 'in_triage' || pipeline === 'queued_worker',
      ),
      at: row.investigationRequestedAt,
    },
    {
      key: 'triaged',
      label: 'Triado',
      state: stepState(triaged, false, pipeline === 'triaged' && !resolved),
      at: row.updatedAt,
    },
    {
      key: 'defect',
      label: 'DEF vinculado',
      state: stepState(linked, false, triaged && !linked && !resolved),
    },
    {
      key: 'resolved',
      label: 'Resolvido',
      state: stepState(resolved, dismissed, false),
      at: row.completedAt,
    },
  ]
}

export function defectStatusRank(status: PlatformDefectStatus): number {
  const order: Record<PlatformDefectStatus, number> = {
    open: 0,
    in_fix: 1,
    ready_for_pr: 2,
    fixed: 3,
  }
  return order[status]
}
