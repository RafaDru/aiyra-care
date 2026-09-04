export type CareCircleMemberRole = 'owner' | 'admin' | 'member'

export interface CareCircleData {
  id: string
  name: string
  billingOwnerAccountId: string
  createdAt: Date
  updatedAt: Date
}

export interface CareCircleMemberData {
  id: string
  circleId: string
  accountId: string
  role: CareCircleMemberRole
  createdAt: Date
  email?: string | null
  displayName?: string | null
}

export interface CareCirclePatientLink {
  patientId: string
  patientName: string
  circleId: string
  linkKind?: 'primary' | 'shared'
}

export interface CareCircleListItem extends CareCircleData {
  memberRole: CareCircleMemberRole
}

export interface CareCircleDashboardGroup {
  id: string
  name: string
  memberRole: CareCircleMemberRole
  patientIds: string[]
}

export interface CareCircleDetail {
  circle: CareCircleData
  memberRole: CareCircleMemberRole
  members: CareCircleMemberData[]
  patients: CareCirclePatientLink[]
}
