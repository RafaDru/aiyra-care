export function formatBrl(cents: number): string {
  return (cents / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

export function formatUsdCents(cents: number): string {
  return (cents / 100).toLocaleString('en-US', { style: 'currency', currency: 'USD' })
}

export function formatDateTimePtBr(iso: string): string {
  return new Date(iso).toLocaleString('pt-BR')
}

/** Relative time in pt-BR (e.g. «há 5 min»). */
export function formatRelativePtBr(iso: string, refMs = Date.now()): string {
  const then = new Date(iso).getTime()
  const diffSec = Math.round((then - refMs) / 1000)
  const rtf = new Intl.RelativeTimeFormat('pt-BR', { numeric: 'auto' })
  const absSec = Math.abs(diffSec)
  if (absSec < 60) return rtf.format(diffSec, 'second')
  const diffMin = Math.round(diffSec / 60)
  if (Math.abs(diffMin) < 60) return rtf.format(diffMin, 'minute')
  const diffHr = Math.round(diffSec / 3600)
  if (Math.abs(diffHr) < 24) return rtf.format(diffHr, 'hour')
  const diffDay = Math.round(diffSec / 86400)
  if (Math.abs(diffDay) < 30) return rtf.format(diffDay, 'day')
  const diffMonth = Math.round(diffSec / (86400 * 30))
  if (Math.abs(diffMonth) < 12) return rtf.format(diffMonth, 'month')
  const diffYear = Math.round(diffSec / (86400 * 365))
  return rtf.format(diffYear, 'year')
}
