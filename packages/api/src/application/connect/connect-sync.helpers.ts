export function parseDate(dateStr: string): Date | null {
  if (!dateStr) return null
  const parts = dateStr.split('/')
  if (parts.length === 3) {
    const d = new Date(`${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}T12:00:00`)
    if (!isNaN(d.getTime())) return d
  }
  const d = new Date(dateStr)
  return isNaN(d.getTime()) ? null : d
}

export function parseFlexibleDate(dateStr: string): Date | null {
  if (!dateStr) return null
  const iso = parseDate(dateStr)
  if (iso) return iso
  const m = /^(\d{4}-\d{2}-\d{2})/.exec(dateStr)
  if (m) {
    const d = new Date(`${m[1]}T12:00:00`)
    if (!isNaN(d.getTime())) return d
  }
  return null
}

export function normalizeName(name: string | null | undefined): string {
  return (name || '').normalize('NFD').replace(/\p{M}/gu, '').toUpperCase().replace(/\s+/g, ' ').trim()
}

export function findOriginatingConsulta(
  records: Array<{
    id: string
    recordDate: Date
    recordType: string
    doctorName: string | null
    providerExternalId: string | null
    description: string | null
  }>,
  auth: { providerExternalId?: string; doctorName?: string; authorizationDate: Date | null },
) {
  const consultas = records.filter((r) => r.recordType === 'consulta')
  if (!consultas.length || !auth.authorizationDate) return undefined

  const authDay = auth.authorizationDate.toISOString().slice(0, 10)
  const byProvider = auth.providerExternalId
    ? consultas.find(
        (r) =>
          r.providerExternalId === auth.providerExternalId
          && r.recordDate.toISOString().slice(0, 10) === authDay,
      )
    : undefined
  if (byProvider) return byProvider

  const authDoctor = normalizeName(auth.doctorName)
  return consultas.find(
    (r) =>
      normalizeName(r.doctorName) === authDoctor
      && r.recordDate.toISOString().slice(0, 10) === authDay,
  )
}
