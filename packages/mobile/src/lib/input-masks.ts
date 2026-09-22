/** Máscaras de entrada BR (CPF, data) — sem validação profunda de CPF. */

export function digitsOnly(value: string): string {
  return value.replace(/\D/g, '')
}

export function formatCpfInput(value: string): string {
  const d = digitsOnly(value).slice(0, 11)
  if (d.length <= 3) return d
  if (d.length <= 6) return `${d.slice(0, 3)}.${d.slice(3)}`
  if (d.length <= 9) return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6)}`
  return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6, 9)}-${d.slice(9)}`
}

export function formatDateBrInput(value: string): string {
  const d = digitsOnly(value).slice(0, 8)
  if (d.length <= 2) return d
  if (d.length <= 4) return `${d.slice(0, 2)}/${d.slice(2)}`
  return `${d.slice(0, 2)}/${d.slice(2, 4)}/${d.slice(4)}`
}

export function isoDateToBrInput(iso: string | null | undefined): string {
  if (!iso) return ''
  try {
    const d = new Date(iso)
    const dd = String(d.getDate()).padStart(2, '0')
    const mm = String(d.getMonth() + 1).padStart(2, '0')
    const yyyy = d.getFullYear()
    return `${dd}/${mm}/${yyyy}`
  } catch {
    return ''
  }
}

export function formatTimeBrInput(value: string): string {
  const d = digitsOnly(value).slice(0, 4)
  if (d.length <= 2) return d
  return `${d.slice(0, 2)}:${d.slice(2)}`
}

export function isoToDateTimeBrParts(iso: string | null | undefined): { date: string; time: string } {
  if (!iso) return { date: '', time: '' }
  try {
    const dt = new Date(iso)
    const dd = String(dt.getDate()).padStart(2, '0')
    const mm = String(dt.getMonth() + 1).padStart(2, '0')
    const yyyy = dt.getFullYear()
    const hh = String(dt.getHours()).padStart(2, '0')
    const min = String(dt.getMinutes()).padStart(2, '0')
    return { date: `${dd}/${mm}/${yyyy}`, time: `${hh}:${min}` }
  } catch {
    return { date: '', time: '' }
  }
}

export function parseDateTimeBrToIso(dateBr: string, timeBr: string): string | null {
  const dm = dateBr.trim().match(/^(\d{2})\/(\d{2})\/(\d{4})$/)
  if (!dm) return null
  const day = Number(dm[1])
  const month = Number(dm[2])
  const year = Number(dm[3])
  const tm = timeBr.trim().match(/^(\d{2}):(\d{2})$/)
  if (!tm) return null
  const hours = Number(tm[1])
  const minutes = Number(tm[2])
  if (hours > 23 || minutes > 59) return null
  const date = new Date(year, month - 1, day, hours, minutes, 0, 0)
  if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) {
    return null
  }
  return date.toISOString()
}

export function parseDateBrToIso(raw: string): string | null {
  const m = raw.trim().match(/^(\d{2})\/(\d{2})\/(\d{4})$/)
  if (!m) return null
  const day = Number(m[1])
  const month = Number(m[2])
  const year = Number(m[3])
  const date = new Date(year, month - 1, day, 12, 0, 0, 0)
  if (
    date.getFullYear() !== year ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day
  ) {
    return null
  }
  return date.toISOString()
}

export function firstNameFromFullName(name: string): string {
  const trimmed = name.trim()
  if (!trimmed) return ''
  return trimmed.split(/\s+/)[0] ?? trimmed
}

export function looksLikeEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim())
}

/** Nome curto na home — nunca usa e-mail como saudação. */
export function resolveHomeGreetingName(
  displayName: string | null | undefined,
  selfPatientName: string | null | undefined,
): string {
  if (displayName?.trim() && !looksLikeEmail(displayName)) {
    return firstNameFromFullName(displayName)
  }
  if (selfPatientName?.trim()) return firstNameFromFullName(selfPatientName)
  return ''
}
