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

export function medicationSubtitle(med: {
  dosage: string | null
  frequency: string | null
  route: string | null
}): string | null {
  const parts = [med.dosage, med.frequency, med.route].map((p) => p?.trim()).filter(Boolean)
  return parts.length > 0 ? parts.join(' · ') : null
}
