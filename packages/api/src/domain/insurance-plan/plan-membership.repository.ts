import type { PlanMembership } from './plan-membership.entity.js'

export type PlanMembershipFilter = { patientId?: string; insurancePlanId?: string; status?: string }

export interface PlanMembershipRepository {
  findById(id: string): Promise<PlanMembership | null>
  findByPatientAndMember(patientId: string, insurancePlanId: string, memberNumber: string | null): Promise<PlanMembership | null>
  findAll(filter?: PlanMembershipFilter): Promise<PlanMembership[]>
  save(membership: PlanMembership): Promise<PlanMembership>
  update(membership: PlanMembership): Promise<PlanMembership>
  delete(id: string): Promise<void>
}
