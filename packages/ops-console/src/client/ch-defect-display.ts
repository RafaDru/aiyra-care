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
