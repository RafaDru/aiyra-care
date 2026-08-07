export const CLINICAL_ENTITY_TYPES = [
  'exam',
  'medical_record',
  'authorization',
  'medication',
  'diagnosis',
  'vaccine',
  'health_thread',
] as const

export type ClinicalEntityType = (typeof CLINICAL_ENTITY_TYPES)[number]

export function isClinicalEntityType(value: string): value is ClinicalEntityType {
  return (CLINICAL_ENTITY_TYPES as readonly string[]).includes(value)
}
