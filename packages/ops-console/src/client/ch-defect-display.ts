import type { PlatformDefectItem, PlatformDefectStatus } from './ops.types.js'

export const DEFECT_STATUS_LABEL: Record<PlatformDefectStatus, string> = {
  open: 'Aberto',
  in_fix: 'Em correção',
  ready_for_pr: 'Pronto para PR',
  fixed: 'Corrigido',
}

export const DEFECT_STATUS_COLOR: Record<PlatformDefectStatus, string> = {
  open: 'gold',
  in_fix: 'processing',
  ready_for_pr: 'purple',
  fixed: 'default',
}

export function defectStatusLabel(status: PlatformDefectStatus): string {
  return DEFECT_STATUS_LABEL[status]
}

export function defectHasCorrectionFailure(item: {
  correctionFailedAt?: string | null
  lastCorrectionFailureDetails?: { message: string } | null
}): boolean {
  return Boolean(item.correctionFailedAt && item.lastCorrectionFailureDetails?.message)
}

export function defectStatusColor(status: PlatformDefectStatus): string {
  return DEFECT_STATUS_COLOR[status]
}

export function defectReadyForPrCount(items: PlatformDefectItem[]): number {
  return items.filter((d) => d.status === 'ready_for_pr' && !d.prBatchId).length
}

export function formatBatchWindowHours(intervalMs: number): string {
  const hours = Math.max(1, Math.round(intervalMs / 3_600_000))
  return `${hours}h`
}

/** Tag curta alinhada ao payload defect_fix_v1 (`text` / PR). */
export function defectShortTag(defectId: string): string {
  return `[defect:${defectId.slice(0, 8)}]`
}

export function formatDefectRefLine(item: {
  id: string
  referenceCode: string | null
}): string {
  const tag = defectShortTag(item.id)
  return item.referenceCode ? `${item.referenceCode} · ${tag}` : tag
}

export function defectFixedViaHint(fixedVia: PlatformDefectItem['fixedVia']): string | null {
  if (fixedVia === 'github_webhook') return 'Fechado via merge GitHub (webhook)'
  if (fixedVia === 'manual') return 'Marcado manualmente no CH'
  return null
}

export function defectIsRecurrence(item: { parentDefectId?: string | null }): boolean {
  return Boolean(item.parentDefectId)
}

const REVIEW_FIELD_LABELS: Record<string, string> = {
  plausible: 'Plausível',
  uncertain: 'Incerto',
  unlikely: 'Improvável',
  approve: 'Aprovar merge',
  request_changes: 'Pedir mudanças',
  block: 'Bloquear (advisory)',
  pass: 'Ok',
  concerns: 'Ressalvas',
  running: 'Revisando…',
  pending: 'Na fila',
  completed: 'Concluída',
  failed: 'Falhou',
}

export function humanizeDefectReviewField(value: string | null | undefined): string {
  if (!value) return '—'
  return REVIEW_FIELD_LABELS[value] ?? value
}

export function defectReviewRowBadge(
  item: PlatformDefectItem,
): { label: string; color: string } | null {
  if (item.status !== 'ready_for_pr') return null
  const review = item.latestReview
  if (!review) return { label: 'Review', color: 'default' }
  if (review.recommendation) {
    const color =
      review.recommendation === 'approve'
        ? 'success'
        : review.recommendation === 'request_changes'
          ? 'warning'
          : review.recommendation === 'block'
            ? 'error'
            : 'default'
    return { label: humanizeDefectReviewField(review.recommendation), color }
  }
  return { label: humanizeDefectReviewField(review.status), color: 'processing' }
}
