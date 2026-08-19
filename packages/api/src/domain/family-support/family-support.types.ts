export type FamilySupportAudience = 'family' | 'clinical'

export type FamilySupportInsightKind =
  | 'vital_alert'
  | 'medication_safety'
  | 'discuss_with_doctor'
  | 'consult_prep'

export type FamilySupportAction =
  | 'verify_reading'
  | 'discuss_with_doctor'
  | 'seek_medical_care'
  | 'inform_doctor'
  | 'review_before_dose'
  | 'do_not_apply'

export type FamilySupportPriority = 'info' | 'attention' | 'urgent' | 'critical'

export interface FamilySupportCitation {
  kind: 'measurement' | 'allergy' | 'medication' | 'health_thread'
  entityId?: string
  label: string
  observedAt?: string
}

export interface FamilySupportInsight {
  id: string
  kind: FamilySupportInsightKind
  action: FamilySupportAction
  priority: FamilySupportPriority
  title: string
  message: string
  citations: FamilySupportCitation[]
  audience: FamilySupportAudience
}

export interface FamilySupportBundle {
  disclaimer: string
  insights: FamilySupportInsight[]
  generatedAt: string
  patientId: string
}

export interface VitalRuleInput {
  typeCode: string
  label: string
  unit: string | null
  value: number
  observedAt: Date
  observationId: string
  criticalLow?: number
  criticalHigh?: number
}
