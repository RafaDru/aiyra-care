const VACCINE_SOURCE_LABELS: Record<string, string> = {
  manual: 'Manual',
  conectesus: 'ConecteSUS',
  ocr: 'Documento',
}

export function formatClinicalDate(iso: string | null | undefined, locale: string): string {
  if (!iso) return '—'
  try {
    return new Date(iso).toLocaleDateString(locale, {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    })
  } catch {
    return iso
  }
}

export function formatVaccineSource(source: string | null | undefined): string {
  if (!source) return '—'
  return VACCINE_SOURCE_LABELS[source] ?? source.replace(/_/g, ' ')
}

export function medicationDisplayName(genericName: string, brandName: string | null): string {
  const brand = brandName?.trim()
  if (!brand) return genericName
  return `${genericName} (${brand})`
}

const ALLERGY_SEVERITY_KEYS = new Set(['mild', 'moderate', 'severe'])

export function allergySeverityKey(severity: string | null | undefined): string | null {
  if (!severity) return null
  const s = severity.toLowerCase()
  return ALLERGY_SEVERITY_KEYS.has(s) ? s : null
}

const RECORD_SOURCE_LABELS: Record<string, string> = {
  manual: 'Manual',
  unimed_bh: 'Unimed BH',
  amil: 'Amil',
  portal: 'Portal',
}

const RECORD_TYPE_LABELS: Record<string, string> = {
  consulta: 'Consulta',
  retorno: 'Retorno',
  'pronto-socorro': 'Pronto socorro',
  teleconsulta: 'Teleconsulta',
  outro: 'Outro',
}

export const MEDICAL_RECORD_TYPES = ['consulta', 'retorno', 'pronto-socorro', 'teleconsulta', 'outro'] as const

export type MedicalRecordType = (typeof MEDICAL_RECORD_TYPES)[number]

export function formatRecordType(recordType: string | null | undefined): string {
  if (!recordType) return '—'
  return RECORD_TYPE_LABELS[recordType] ?? recordType.replace(/-/g, ' ')
}

export function formatRecordSource(source: string | null | undefined): string {
  if (!source) return '—'
  return RECORD_SOURCE_LABELS[source] ?? source.replace(/_/g, ' ')
}

export function formatCurrencyBrl(value: number | null | undefined): string | null {
  if (value == null || Number.isNaN(value)) return null
  return `R$ ${value.toFixed(2)}`
}

export function medicationSubtitle(med: {
  dosage: string | null
  frequency: string | null
  route: string | null
}): string | null {
  const parts = [med.dosage, med.frequency, med.route].map((p) => p?.trim()).filter(Boolean)
  return parts.length > 0 ? parts.join(' · ') : null
}
