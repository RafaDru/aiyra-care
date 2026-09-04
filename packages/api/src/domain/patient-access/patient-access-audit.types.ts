export const PATIENT_ACCESS_AUDIT_ACTIONS = [
  'grant_created',
  'grant_revoked',
  'invite_sent',
  'invite_accepted',
  'invite_revoked',
] as const

export type PatientAccessAuditAction = typeof PATIENT_ACCESS_AUDIT_ACTIONS[number]

export interface PatientAccessAuditRecord {
  id: string
  patientId: string
  actorAccountId: string
  targetAccountId: string | null
  action: PatientAccessAuditAction
  accessLevel: string | null
  membershipRole: string | null
  careCircleId: string | null
  inviteId: string | null
  grantId: string | null
  patientCount: number | null
  createdAt: Date
  actorDisplayName: string | null
  actorEmail: string | null
  targetDisplayName: string | null
  targetEmail: string | null
}

export interface PatientAccessAuditInsert {
  patientId: string
  actorAccountId: string
  targetAccountId?: string | null
  action: PatientAccessAuditAction
  accessLevel?: string | null
  membershipRole?: string | null
  careCircleId?: string | null
  inviteId?: string | null
  grantId?: string | null
  patientCount?: number | null
  requestIp?: string | null
}
