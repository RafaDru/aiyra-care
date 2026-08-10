import type { ClinicalEntityType } from './api.types.js'
import { tabToSection, type PatientTabKey } from './patient-navigation.js'

/** Aba do perfil do paciente para cada tipo canônico clínico. */
export const CLINICAL_ENTITY_TAB: Partial<Record<ClinicalEntityType, string>> = {
  medical_record: 'records',
  authorization: 'authorizations',
  exam: 'exams',
  medication: 'medications',
  vaccine: 'vaccines',
  diagnosis: 'diagnoses',
}

export function clinicalEntityTabKey(entityType: ClinicalEntityType): string | undefined {
  return CLINICAL_ENTITY_TAB[entityType]
}

export function buildPatientEntityHref(
  patientId: string,
  entityType: ClinicalEntityType,
  entityId: string,
): string | undefined {
  const tab = clinicalEntityTabKey(entityType)
  if (!tab) return undefined
  const section = tabToSection(tab as PatientTabKey)
  return `/patients/${patientId}?section=${section}&tab=${tab}&highlight=${entityId}`
}
