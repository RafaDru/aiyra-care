/** Deep links CH (Operação → Incidentes / Defeitos) — clique primário navega; copiar é secundário. */

function chUrl(params: Record<string, string>): string {
  const q = new URLSearchParams(params)
  return `${window.location.origin}${window.location.pathname}?${q.toString()}`
}

export function buildIncidentRefDeepLink(referenceCode: string): string {
  return chUrl({
    group: 'operacao',
    tab: 'incidentes',
    incidentRef: referenceCode,
  })
}

export function buildInvestigationDeepLink(investigationId: string): string {
  return chUrl({
    group: 'operacao',
    tab: 'incidentes',
    investigationId,
  })
}

export function buildDefectRefDeepLink(referenceCode: string): string {
  return chUrl({
    group: 'operacao',
    tab: 'defeitos',
    defectRef: referenceCode,
  })
}

export function buildDefectDeepLink(defectId: string): string {
  return chUrl({
    group: 'operacao',
    tab: 'defeitos',
    defectId,
  })
}

export function inferOpsReferenceHref(code: string | null | undefined): string | null {
  if (!code) return null
  const trimmed = code.trim()
  if (/^INC-/i.test(trimmed)) return buildIncidentRefDeepLink(trimmed)
  if (/^DEF-/i.test(trimmed)) return buildDefectRefDeepLink(trimmed)
  return null
}
