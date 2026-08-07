import { InsurancePlan, type InsurancePlanProps, type PlanAddOn, type PlanWaitingPeriod } from '../../domain/insurance-plan/insurance-plan.entity.js'
import { PlanMembership } from '../../domain/insurance-plan/plan-membership.entity.js'
import type { InsurancePlanRepository } from '../../domain/insurance-plan/insurance-plan.repository.js'
import type { PlanMembershipRepository } from '../../domain/insurance-plan/plan-membership.repository.js'

export interface PortalPlanSnapshot {
  operator: string
  operatorName?: string
  planName: string
  productCode?: string
  networkName?: string
  networkCode?: string
  segmentation?: string
  accommodation?: string
  geographicCoverage?: string
  regulationType?: string
  contractType?: string
  contractorName?: string
  addOns?: PlanAddOn[]
  waitingPeriods?: PlanWaitingPeriod[]
  externalKey: string
  source: string
  raw?: Record<string, unknown>
  memberNumber?: string
  role?: string
  status?: string
  cns?: string
  inclusionDate?: Date | null
  cardValidFrom?: Date | null
  cardValidTo?: Date | null
}

export class InsurancePlanService {
  constructor(
    private readonly planRepo: InsurancePlanRepository,
    private readonly membershipRepo: PlanMembershipRepository,
  ) {}

  async findMembershipsByPatient(patientId: string) {
    const memberships = await this.membershipRepo.findAll({ patientId })
    const plans = await Promise.all(memberships.map((m) => this.planRepo.findById(m.insurancePlanId)))
    return memberships.map((m, i) => ({
      ...m.toJSON(),
      plan: plans[i]?.toJSON() ?? null,
    }))
  }

  async upsertFromPortal(
    patientId: string,
    snapshot: PortalPlanSnapshot,
    integrationLinkId?: string,
  ) {
    const planProps: InsurancePlanProps = {
      operator: snapshot.operator,
      operatorName: snapshot.operatorName,
      planName: snapshot.planName,
      productCode: snapshot.productCode,
      networkName: snapshot.networkName,
      networkCode: snapshot.networkCode,
      segmentation: snapshot.segmentation,
      accommodation: snapshot.accommodation,
      geographicCoverage: snapshot.geographicCoverage,
      regulationType: snapshot.regulationType,
      contractType: snapshot.contractType,
      contractorName: snapshot.contractorName,
      addOns: snapshot.addOns,
      waitingPeriods: snapshot.waitingPeriods,
      externalKey: snapshot.externalKey,
      source: snapshot.source,
      raw: snapshot.raw,
    }

    let plan = await this.planRepo.findByExternalKey(snapshot.operator, snapshot.externalKey)
    if (plan) {
      plan.mergeFromPortal(planProps)
      plan = await this.planRepo.update(plan)
    } else {
      plan = await this.planRepo.save(InsurancePlan.create(planProps))
    }

    const memberNumber = snapshot.memberNumber ?? null
    let membership = await this.membershipRepo.findByPatientAndMember(patientId, plan.id, memberNumber)
    if (membership) {
      membership.markSynced({
        memberNumber: memberNumber ?? undefined,
        role: snapshot.role,
        status: snapshot.status,
        cns: snapshot.cns,
        inclusionDate: snapshot.inclusionDate ?? undefined,
        cardValidFrom: snapshot.cardValidFrom ?? undefined,
        cardValidTo: snapshot.cardValidTo ?? undefined,
        integrationLinkId,
      })
      membership = await this.membershipRepo.update(membership)
    } else {
      membership = await this.membershipRepo.save(PlanMembership.create({
        patientId,
        insurancePlanId: plan.id,
        integrationLinkId,
        memberNumber: memberNumber ?? undefined,
        role: snapshot.role,
        status: snapshot.status ?? 'active',
        cns: snapshot.cns,
        inclusionDate: snapshot.inclusionDate ?? undefined,
        cardValidFrom: snapshot.cardValidFrom ?? undefined,
        cardValidTo: snapshot.cardValidTo ?? undefined,
        source: snapshot.source,
        lastSyncedAt: new Date(),
      }))
    }

    return { plan: plan.toJSON(), membership: membership.toJSON() }
  }
}
