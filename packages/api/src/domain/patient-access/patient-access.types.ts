export type PatientAccessLevel = 'full' | 'read_only'
export type PatientMembershipRole = 'self' | 'guardian' | 'caregiver'

export interface PatientAccessGrantData {
  id: string
  patientId: string
  accountId: string
  accessLevel: PatientAccessLevel
  membershipRole: PatientMembershipRole
  grantedBy: string | null
  revokedAt: Date | null
  createdAt: Date
  updatedAt: Date
}
