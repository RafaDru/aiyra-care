import type { PatientAccessGrantData, PatientAccessLevel, PatientMembershipRole } from './patient-access.types.js'

export interface PatientAccessGrantRepository {
  listActiveForPatient(patientId: string): Promise<PatientAccessGrantData[]>
  listAccessiblePatientIds(accountId: string): Promise<string[]>
  findActive(patientId: string, accountId: string): Promise<PatientAccessGrantData | null>
  findById(grantId: string): Promise<PatientAccessGrantData | null>
  upsertActive(input: {
    patientId: string
    accountId: string
    accessLevel: PatientAccessLevel
    membershipRole: PatientMembershipRole
    grantedBy: string | null
  }): Promise<PatientAccessGrantData>
  revoke(grantId: string): Promise<boolean>
  countActiveFullGrants(patientId: string): Promise<number>
}
