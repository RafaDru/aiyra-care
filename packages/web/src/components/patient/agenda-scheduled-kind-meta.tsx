import {
  BellOutlined,
  CalendarOutlined,
  CheckSquareOutlined,
} from '@ant-design/icons'
import type { ScheduledEventKind } from '../../lib/api.types.js'

export const AGENDA_SCHEDULED_KIND_META: Record<
  ScheduledEventKind,
  { color: string; bg: string; Icon: typeof CalendarOutlined }
> = {
  appointment: { color: '#2563eb', bg: 'rgba(37, 99, 235, 0.12)', Icon: CalendarOutlined },
  reminder: { color: '#d97706', bg: 'rgba(217, 119, 6, 0.12)', Icon: BellOutlined },
  task: { color: '#7c3aed', bg: 'rgba(124, 58, 237, 0.12)', Icon: CheckSquareOutlined },
}

export function agendaScheduledKindMeta(kind: ScheduledEventKind | string) {
  return (
    AGENDA_SCHEDULED_KIND_META[kind as ScheduledEventKind] ?? {
      color: '#64748b',
      bg: 'rgba(100, 116, 139, 0.12)',
      Icon: CalendarOutlined,
    }
  )
}
