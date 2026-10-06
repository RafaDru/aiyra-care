import type { PlatformDefectStatus } from './ops.types.js'

export type DefectBoardStatusFilter = 'all_open' | 'ready_for_pr' | 'fixed' | 'all' | PlatformDefectStatus

export const DEFECT_BOARD_FILTER_LABELS: Record<
  'all_open' | 'ready_for_pr' | 'fixed' | 'all'
  | PlatformDefectStatus,
  string
> = {
  all_open: 'Em aberto',
  all: 'Todos',
  open: 'Aberto',
  in_fix: 'Em correção',
  ready_for_pr: 'Pronto para PR',
  fixed: 'Corrigido',
}

export const DEFECT_OPEN_STATUS_LIST = 'open,in_fix,ready_for_pr'

export function defectMatchesStatusFilter(
  status: PlatformDefectStatus,
  filter: DefectBoardStatusFilter,
): boolean {
  if (filter === 'all') return true
  if (filter === 'all_open') {
    return status === 'open' || status === 'in_fix' || status === 'ready_for_pr'
  }
  return status === filter
}
