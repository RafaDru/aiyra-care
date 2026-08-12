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

export interface PatientContextTimelineEvent {
  date: string
  kind: PatientContextTimelineKind
  title: string
  subtitle?: string
  source: string
  entityId?: string
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
