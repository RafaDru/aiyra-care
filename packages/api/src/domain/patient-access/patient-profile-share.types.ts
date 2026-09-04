export const PROFILE_SHARE_TTL_DAYS = 14

export const PROFILE_SHARE_STATUSES = ['pending', 'accepted', 'declined', 'revoked'] as const
export type ProfileShareStatus = typeof PROFILE_SHARE_STATUSES[number]

export interface PatientProfileShareInvite {
  id: string
  patientId: string
  patientName: string
  ownerAccountId: string
  ownerDisplayName: string | null
  targetAccountEmail: string
  targetCircleId: string | null
  targetCircleName: string | null
  status: ProfileShareStatus
  token: string
  legitimacyAck: boolean
  expiresAt: Date
  acceptedAt: Date | null
  acceptedByAccountId: string | null
  createdAt: Date
  updatedAt: Date
}

export interface CreateProfileShareInput {
  patientId: string
  ownerAccountId: string
  targetAccountEmail: string
  legitimacyAck: boolean
}

export interface AcceptProfileShareInput {
  token: string
  accountId: string
  accountEmail: string | null
  circleId: string
}
