import type { PlatformDefectStatus } from './platform-defect.types.js'

export type DefectBoardStatusFilter = 'all_open' | 'ready_for_pr' | 'fixed' | 'all'

export const DEFECT_BOARD_OPEN_STATUSES: PlatformDefectStatus[] = [
  'open',
  'in_fix',
  'ready_for_pr',
]

export function defectMatchesBoardFilter(
  status: PlatformDefectStatus,
  filter: DefectBoardStatusFilter,
): boolean {
  switch (filter) {
    case 'all_open':
      return DEFECT_BOARD_OPEN_STATUSES.includes(status)
    case 'ready_for_pr':
      return status === 'ready_for_pr'
    case 'fixed':
      return status === 'fixed'
    case 'all':
      return true
    default:
      return defectMatchesBoardFilter(status, 'all_open')
  }
}

export function suggestDefectStatusFilter(status: PlatformDefectStatus): DefectBoardStatusFilter {
  if (status === 'fixed') return 'fixed'
  if (status === 'ready_for_pr') return 'ready_for_pr'
  if (status === 'open' || status === 'in_fix') return 'all_open'
  return 'all'
}
