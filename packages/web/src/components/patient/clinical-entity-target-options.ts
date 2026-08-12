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
}

export const CLINICAL_ENTITY_TARGET_TABS: Array<{
  key: ClinicalEntityTargetGroup
  label: string
}> = [
  { key: 'medical_record', label: 'Consultas' },
  { key: 'authorization', label: 'Autorizações' },
  { key: 'exam', label: 'Exames' },
]

function formatRecordLabel(r: MedicalRecord): string {
  return r.doctorName ?? r.specialty ?? r.recordType
}

function formatAuthLabel(a: Authorization): string {
  return a.classification ?? a.procedureDescription ?? a.guideNumber ?? '—'
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
    options.push({
      value: `exam:${e.id}`,
      label: e.examType,
      entityType: 'exam',
      entityId: e.id,
      group: 'exam',
    })
  }

  for (const r of records) {
    if (exclude?.entityType === 'medical_record' && exclude.entityId === r.id) continue
    options.push({
      value: `medical_record:${r.id}`,
      label: formatRecordLabel(r),
      entityType: 'medical_record',
      entityId: r.id,
      group: 'medical_record',
    })
  }

  for (const a of auths) {
    if (exclude?.entityType === 'authorization' && exclude.entityId === a.id) continue
    options.push({
      value: `authorization:${a.id}`,
      label: formatAuthLabel(a),
      entityType: 'authorization',
      entityId: a.id,
      group: 'authorization',
    })
  }

  return options
}

export function targetGroupForValue(
  options: ClinicalEntityTargetOption[],
  value?: string,
): ClinicalEntityTargetGroup | undefined {
  return options.find((o) => o.value === value)?.group
}
