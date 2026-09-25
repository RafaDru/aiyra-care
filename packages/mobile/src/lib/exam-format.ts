const SOURCE_LABELS: Record<string, string> = {
  manual: 'Manual',
  unimed_bh: 'Unimed BH',
  amil: 'Amil',
  mater_dei: 'Mater Dei',
  hermes_pardini: 'Grupo Fleury',
  conectesus: 'ConecteSUS',
  ocr: 'Documento',
}

export function formatExamDate(iso: string | null | undefined): string {
  if (!iso) return '—'
  try {
    return new Date(iso).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    })
  } catch {
    return iso
  }
}

export function formatExamSource(source: string | null | undefined): string {
  if (!source) return '—'
  return SOURCE_LABELS[source] ?? source.replace(/_/g, ' ')
}
