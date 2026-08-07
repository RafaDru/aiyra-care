/** Tipos de registro no payload canônico (Connect → Core). */
export type CanonicalRecordType =
  | 'authorization'
  | 'authorization_item'
  | 'exam'
  | 'medical_record'
  | 'immunization'
  | 'coverage'
  | 'coverage_membership'
  | 'beneficiary'
  | 'document_reference'

/** Alinha com import-lineage ImportRecordType onde possível. */
export type CanonicalRecordTypeMap = {
  authorization: 'authorization'
  authorization_item: 'authorization'
  exam: 'exam'
  medical_record: 'clinical_record'
  immunization: 'vaccine_applied'
  coverage: 'insurance_plan'
  coverage_membership: 'insurance_plan'
  beneficiary: 'patient_identity'
  document_reference: 'document'
}
