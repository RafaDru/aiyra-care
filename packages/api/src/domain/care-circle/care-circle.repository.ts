import type {
  CareCircleData,
  CareCircleDashboardGroup,
  CareCircleDetail,
  CareCircleListItem,
  CareCircleMemberData,
  CareCircleMemberRole,
  CareCirclePatientLink,
} from './care-circle.types.js'

export interface CareCircleRepository {
  create(name: string, billingOwnerAccountId: string): Promise<CareCircleData>
  findById(id: string): Promise<CareCircleData | null>
  updateName(id: string, name: string): Promise<CareCircleData | null>
  listForAccount(accountId: string): Promise<CareCircleListItem[]>
  listDashboardGroups(accountId: string): Promise<CareCircleDashboardGroup[]>
  findMember(circleId: string, accountId: string): Promise<CareCircleMemberData | null>
  listMembers(circleId: string): Promise<CareCircleMemberData[]>
  addMember(circleId: string, accountId: string, role: CareCircleMemberRole): Promise<CareCircleMemberData>
  updateMemberRole(memberId: string, role: CareCircleMemberRole): Promise<CareCircleMemberData | null>
  removeMember(memberId: string): Promise<boolean>
  countAdmins(circleId: string): Promise<number>
  listPatients(circleId: string): Promise<CareCirclePatientLink[]>
  linkPatient(circleId: string, patientId: string): Promise<void>
  unlinkPatient(circleId: string, patientId: string): Promise<boolean>
  getDetail(circleId: string, accountId: string): Promise<CareCircleDetail | null>
}
