export function parsePortalDate(dateStr: string): Date | null {
  if (!dateStr) return null
  const parts = dateStr.split('/')
  if (parts.length === 3) {
    const d = new Date(`${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}T12:00:00`)
    if (!isNaN(d.getTime())) return d
  }
  const d = new Date(dateStr)
  return isNaN(d.getTime()) ? null : d
}

export function parseFlexiblePortalDate(dateStr: string): Date | null {
  if (!dateStr) return null
  const iso = parsePortalDate(dateStr)
  if (iso) return iso
  const m = /^(\d{4}-\d{2}-\d{2})/.exec(dateStr)
  if (m) {
    const d = new Date(`${m[1]}T12:00:00`)
    if (!isNaN(d.getTime())) return d
  }
  return null
}
