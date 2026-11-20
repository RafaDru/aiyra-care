import type { Patient } from './api.types.js'

/** Espelha `clinicianLabelForAgeCategory` da API (pt-BR, uso em copy Ava). */
export function clinicianLabelForAgeCategory(ageCategory: string): string {
  if (ageCategory === 'children' || ageCategory === 'adolescents') return 'pediatra'
  return 'médico'
}

/** Empty state do chat: pediatra só para dependente criança/adolescente; titular ou adulto → médico. */
export function avaIntroUsesPediatricCopy(
  patient: Pick<Patient, 'isSelf' | 'ageCategory'> | null | undefined,
): boolean {
  if (!patient) return true
  if (patient.isSelf) return false
  return patient.ageCategory === 'children' || patient.ageCategory === 'adolescents'
}
