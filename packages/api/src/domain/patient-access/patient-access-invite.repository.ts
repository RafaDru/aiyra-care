import type {
  PatientAccessInviteData,
  PatientAccessInvitePreview,
  PatientAccessInviteStatus,
} from './patient-access-invite.types.js'
import type { PatientAccessLevel, PatientMembershipRole } from './patient-access.types.js'
import type { PatientAccessInviteCircleRole } from './patient-access-invite.types.js'

export interface PatientAccessInviteRepository {
  create(input: {
    inviterAccountId: string
    inviteeEmail: string
    patientIds: string[]
    accessLevel: PatientAccessLevel
    membershipRole: PatientMembershipRole
    careCircleId?: string | null
    circleRole?: PatientAccessInviteCircleRole
    token: string
    legitimacyAck: boolean
    expiresAt: Date
  }): Promise<PatientAccessInviteData>
  findById(id: string): Promise<PatientAccessInviteData | null>
  findByToken(token: string): Promise<PatientAccessInviteData | null>
  listByInviter(inviterAccountId: string): Promise<PatientAccessInviteData[]>
  listPendingForEmail(email: string): Promise<PatientAccessInviteData[]>
  updateStatus(
    id: string,
    status: PatientAccessInviteStatus,
    acceptedByAccountId?: string,
  ): Promise<PatientAccessInviteData | null>
  getPreview(token: string): Promise<PatientAccessInvitePreview | null>
}
