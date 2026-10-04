import type { Dayjs } from 'dayjs'

/** Oculta dias do mês seguinte após o dia 3 para reduzir linhas fantasma no grid mensal. */
export function shouldHideAgendaOverflowDay(date: Dayjs, panelMonth: Dayjs): boolean {
  if (date.isSame(panelMonth, 'month')) return false
  const nextMonth = panelMonth.add(1, 'month')
  if (date.isSame(nextMonth, 'month')) return date.date() > 3
  if (date.isAfter(panelMonth, 'month')) return true
  return false
}
