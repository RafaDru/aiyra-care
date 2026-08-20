import type {
  Authorization,
  ClinicalEntityType,
  Exam,
  MedicalRecord,
} from '../../lib/api.types.js'

export type ClinicalEntityTargetGroup = 'medical_record' | 'authorization' | 'exam'

export interface ClinicalEntityTargetOption {
  value: string
  label: string
  entityType: ClinicalEntityType
  entityId: string
  group: ClinicalEntityTargetGroup
  title: string
  dateFormatted: string
  subtitle?: string
  source?: string
  status?: string
  searchValue: string
}

export const CLINICAL_ENTITY_TARGET_TABS: Array<{
  key: ClinicalEntityTargetGroup
  label: string
}> = [
  { key: 'medical_record', label: 'Consultas' },
  { key: 'authorization', label: 'Autorizações' },
  { key: 'exam', label: 'Exames' },
]

function formatDate(isoOrDate?: string | null): string {
  if (!isoOrDate) return 'Sem data'
  try {
    const d = new Date(isoOrDate)
    if (isNaN(d.getTime())) return String(isoOrDate).slice(0, 10)
    const dd = String(d.getUTCDate()).padStart(2, '0')
    const mm = String(d.getUTCMonth() + 1).padStart(2, '0')
    const yyyy = d.getUTCFullYear()
    return `${dd}/${mm}/${yyyy}`
  } catch {
    return String(isoOrDate).slice(0, 10)
  }
}

function formatRecordTitle(r: MedicalRecord): string {
  if (r.description?.trim()) return r.description.trim()
  if (r.doctorName?.trim()) return `Consulta com ${r.doctorName.trim()}`
  if (r.specialty?.trim()) return `Consulta de ${r.specialty.trim()}`
  return r.recordType || 'Consulta'
}

function formatRecordSubtitle(r: MedicalRecord): string | undefined {
  const parts = [
    r.doctorName ? `Dr(a). ${r.doctorName}` : null,
    r.specialty || null,
    r.clinicName || null,
  ].filter(Boolean)
  return parts.length ? parts.join(' • ') : undefined
}

function formatAuthTitle(a: Authorization): string {
  if (a.procedureDescription?.trim()) return a.procedureDescription.trim()
  if (a.classification?.trim()) return a.classification.trim()
  if (a.guideNumber) return `Guia nº ${a.guideNumber}`
  return 'Autorização de plano'
}

function formatAuthSubtitle(a: Authorization): string | undefined {
  const parts = [
    a.doctorName ? `Dr(a). ${a.doctorName}` : null,
    a.clinicName || null,
    a.solicitationNumber ? `Solicitação ${a.solicitationNumber}` : null,
    a.guideNumber && a.guideNumber !== a.solicitationNumber ? `Guia ${a.guideNumber}` : null,
  ].filter(Boolean)
  return parts.length ? parts.join(' • ') : undefined
}

function formatExamSubtitle(e: Exam): string | undefined {
  const parts = [e.laboratory ? `Lab: ${e.laboratory}` : null].filter(Boolean)
  return parts.length ? parts.join(' • ') : undefined
}

export function buildClinicalEntityTargetOptions(
  exams: Exam[],
  records: MedicalRecord[],
  auths: Authorization[],
  exclude?: { entityType: ClinicalEntityType; entityId: string },
): ClinicalEntityTargetOption[] {
  const options: ClinicalEntityTargetOption[] = []

  for (const e of exams) {
    if (exclude?.entityType === 'exam' && exclude.entityId === e.id) continue
    const title = e.examType || 'Exame'
    const dateFormatted = formatDate(e.examDate)
    const subtitle = formatExamSubtitle(e)
    const source = e.source || 'manual'
    const searchValue = `${dateFormatted} ${title} ${subtitle || ''} ${source}`.toLowerCase()

    options.push({
      value: `exam:${e.id}`,
      label: `${dateFormatted} - ${title} ${subtitle ? ' (' + subtitle + ')' : ''}`,
      entityType: 'exam',
      entityId: e.id,
      group: 'exam',
      title,
      dateFormatted,
      subtitle,
      source,
      searchValue,
    })
  }

  for (const r of records) {
    if (exclude?.entityType === 'medical_record' && exclude.entityId === r.id) continue
    const title = formatRecordTitle(r)
    const dateFormatted = formatDate(r.recordDate)
    const subtitle = formatRecordSubtitle(r)
    const source = r.source || 'manual'
    const searchValue = `${dateFormatted} ${title} ${subtitle || ''} ${r.recordType || ''} ${source}`.toLowerCase()

    options.push({
      value: `medical_record:${r.id}`,
      label: `${dateFormatted} - ${title} ${subtitle ? ' (' + subtitle + ')' : ''}`,
      entityType: 'medical_record',
      entityId: r.id,
      group: 'medical_record',
      title,
      dateFormatted,
      subtitle,
      source,
      searchValue,
    })
  }

  for (const a of auths) {
    if (exclude?.entityType === 'authorization' && exclude.entityId === a.id) continue
    const title = formatAuthTitle(a)
    const dateFormatted = formatDate(a.authorizationDate)
    const subtitle = formatAuthSubtitle(a)
    const source = a.source || 'manual'
    const status = a.status
    const searchValue = `${dateFormatted} ${title} ${subtitle || ''} ${status || ''} ${source}`.toLowerCase()

    options.push({
      value: `authorization:${a.id}`,
      label: `${dateFormatted} - ${title} ${subtitle ? ' (' + subtitle + ')' : ''}`,
      entityType: 'authorization',
      entityId: a.id,
      group: 'authorization',
      title,
      dateFormatted,
      subtitle,
      source,
      status,
      searchValue,
    })
  }

  // Ordena por data mais recente primeiro
  options.sort((a, b) => (b.dateFormatted > a.dateFormatted ? 1 : -1))

  return options
}

export function targetGroupForValue(
  options: ClinicalEntityTargetOption[],
  value?: string,
): ClinicalEntityTargetGroup | undefined {
  return options.find((o) => o.value === value)?.group
}
