export type PatientAccessInviteStatus = 'pending' | 'accepted' | 'revoked' | 'expired'

export type PatientAccessInviteCircleRole = 'member' | 'admin'

export interface PatientAccessInviteData {
  id: string
  inviterAccountId: string
  inviteeEmail: string
  patientIds: string[]
  accessLevel: 'full' | 'read_only'
  membershipRole: 'guardian' | 'caregiver'
  careCircleId: string | null
  circleRole: PatientAccessInviteCircleRole
  token: string
  legitimacyAck: boolean
  status: PatientAccessInviteStatus
  expiresAt: Date
  acceptedAt: Date | null
  acceptedByAccountId: string | null
  createdAt: Date
  updatedAt: Date
}

export interface PatientAccessInvitePreview {
  inviteeEmail: string
  patientNames: string[]
  inviterDisplayName: string | null
  circleName: string | null
  accessLevel: 'full' | 'read_only'
  status: PatientAccessInviteStatus
  expiresAt: Date
}
