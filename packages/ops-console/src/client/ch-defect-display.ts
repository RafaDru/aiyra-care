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
