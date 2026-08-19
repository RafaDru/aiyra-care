import type { AgeCategory } from '../../domain/patient/patient.entity.js'

export type PatientContextAlertSeverity = 'info' | 'warning' | 'critical'

export interface PatientContextIdentity {
  name: string
  birthDate: string
  ageYears: number
  ageCategory: AgeCategory
  gender: string | null
  bloodType: string | null
  weightKg: number | null
  heightCm: number | null
  parents: Array<{ id: string; name: string }>
}

export interface PatientContextAlert {
  severity: PatientContextAlertSeverity
  kind: string
  title: string
  detail?: string
}

export type PatientContextTimelineKind =
  | 'consultation'
  | 'extrato'
  | 'exam'
  | 'vaccine'
  | 'authorization'
  | 'medication_start'
  | 'thread_note'

export interface PatientContextActiveThread {
  id: string
  kind: string
  title: string
  status: string
  summary: string | null
  updatedAt: string
  dueDate: string | null
  priority: string
  linkCount: number
}

export interface PatientContextTimelineItem {
  date: string
  title: string
  subtitle?: string
  source: string
  entityId?: string
  examOrderId?: string
}

export interface PatientContextTimelineEvent {
  date: string
  kind: PatientContextTimelineKind
  title: string
  subtitle?: string
  source: string
  entityId?: string
  /** When >1 same-day events of this kind were collapsed into one row */
  count?: number
  items?: PatientContextTimelineItem[]
  /** Present on raw exam rows before grouping; copied into items */
  examOrderId?: string
}

export interface PatientContextPendency {
  kind: string
  title: string
  detail?: string
  threadId?: string
}

export interface PatientContextIntegration {
  portalType: string
  linkId: string
  lastSyncAt: string | null
  syncAuthority?: 'self' | 'titular'
  effectiveSyncLinkId?: string
  managedByPatientId?: string
  managedByPatientName?: string
}

export interface PatientContextPlanMembership {
  operator: string
  planName: string
  memberNumber: string | null
  role: string
  status: string
}

export type PatientClinicalExportMode = 'summary' | 'full'

export interface PatientClinicalExportSections {
  allergies: Array<{ allergen: string; severity: string | null; reaction: string | null }>
  medications: Array<{ name: string; dose: string | null; frequency: string | null }>
  vaccines: Array<{ name: string; administeredAt: string | null; doseLabel: string | null }>
  diagnoses: Array<{ code: string | null; description: string; diagnosedAt: string | null }>
  documents: Array<{ filename: string; type: string; uploadedAt: string; ocrProcessed: boolean }>
  authorizations: Array<{ title: string; date: string | null; status: string }>
  medicalRecords: Array<{ date: string; description: string | null; doctor: string | null }>
  exams: Array<{ name: string; date: string; laboratory: string | null }>
}

export interface PatientClinicalExport {
  mode: PatientClinicalExportMode
  context: PatientContext
  fullSections?: PatientClinicalExportSections
}

export interface PatientContext {
  patientId: string
  generatedAt: string
  identity: PatientContextIdentity
  alerts: PatientContextAlert[]
  timeline: PatientContextTimelineEvent[]
  pendencies: PatientContextPendency[]
  integrations: PatientContextIntegration[]
  planMemberships: PatientContextPlanMembership[]
  activeThreads: PatientContextActiveThread[]
  textSummary: string
}

export interface PatientContextBuildOptions {
  timelineMonths?: number
}

export const PATIENT_TIMELINE_KINDS = [
  'consultation',
  'extrato',
  'exam',
  'vaccine',
  'authorization',
  'medication_start',
  'thread_note',
] as const satisfies readonly PatientContextTimelineKind[]

export interface PatientTimelineFilterOptions {
  timelineMonths?: number
  kinds?: PatientContextTimelineKind[]
  sources?: string[]
  from?: Date
  to?: Date
  limit?: number
  offset?: number
}

export interface PatientTimelineResponse {
  patientId: string
  generatedAt: string
  events: PatientContextTimelineEvent[]
  total: number
}
