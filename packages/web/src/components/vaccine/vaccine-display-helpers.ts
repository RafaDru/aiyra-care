export const SOURCE_LABELS: Record<string, string> = {
  manual: 'Manual',
  particular: 'Particular',
  conectesus: 'ConecteSUS',
  caderneta: 'Caderneta da Criança',
  unimed: 'Unimed BH',
  amil: 'Amil',
  bradesco_saude: 'Bradesco Saúde',
  mater_dei: 'Mater Dei',
}

export function sourceLabel(source?: string | null): string {
  if (!source) return 'Manual'
  const key = source.trim().toLowerCase()
  if (SOURCE_LABELS[key]) return SOURCE_LABELS[key]
  return source
    .replace(/_/g, ' ')
    .split(' ')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ')
}

export function formatShortDate(value?: string | null): string {
  if (!value) return ''
  return new Date(value).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

export function formatPeriodLabel(ageMonths: number): string {
  if (ageMonths === 0) return 'Ao nascer'
  if (ageMonths < 12) return `${ageMonths} meses`
  const years = Math.floor(ageMonths / 12)
  const rem = ageMonths % 12
  if (rem === 0) return `${years} ${years === 1 ? 'ano' : 'anos'}`
  return `${years}a ${rem}m`
}

export function formatDoseLabel(doseNumber: number): string {
  return `${doseNumber}ª dose`
}

export function patientAgeMonths(birthDate: string, at = new Date()): number {
  const birth = new Date(birthDate)
  if (Number.isNaN(birth.getTime())) return 0
  let months = (at.getFullYear() - birth.getFullYear()) * 12 + (at.getMonth() - birth.getMonth())
  if (at.getDate() < birth.getDate()) months -= 1
  return Math.max(0, months)
}

/** Data de referência do calendário = nascimento + idade em meses. */
export function calendarDateAtAgeMonths(birthDate: string, ageMonths: number): Date | null {
  const birth = new Date(birthDate)
  if (Number.isNaN(birth.getTime())) return null
  const d = new Date(birth.getTime())
  d.setMonth(d.getMonth() + ageMonths)
  return d
}

/** Mês/ano de referência para a coluna (ex.: jan/2020). */
export function formatCalendarMonthYear(birthDate: string, ageMonths: number): string | null {
  const d = calendarDateAtAgeMonths(birthDate, ageMonths)
  if (!d) return null
  const month = d.toLocaleDateString('pt-BR', { month: 'short' }).replace(/\./g, '')
  const year = d.getFullYear()
  return `${month}/${year}`
}

export type DoseVisualStatus = 'applied' | 'current' | 'overdue' | 'future'

export const DOSE_STATUS_COLOR: Record<DoseVisualStatus, string> = {
  applied: '#52c41a',
  current: '#fa8c16',
  overdue: '#ff4d4f',
  future: '#bfbfbf',
}

export function resolveVisualStatus(
  hasApplication: boolean,
  scheduleStatus?: string | null,
  expectedAgeMonths: number,
  childAgeMonths: number,
): DoseVisualStatus {
  if (hasApplication || scheduleStatus === 'applied') return 'applied'
  if (scheduleStatus === 'overdue') return 'overdue'
  if (childAgeMonths >= expectedAgeMonths) return 'current'
  return 'future'
}
