import type { InsurancePlan } from './insurance-plan.entity.js'

export type InsurancePlanFilter = { operator?: string }

export interface InsurancePlanRepository {
  findById(id: string): Promise<InsurancePlan | null>
  findByExternalKey(operator: string, externalKey: string): Promise<InsurancePlan | null>
  findAll(filter?: InsurancePlanFilter): Promise<InsurancePlan[]>
  save(plan: InsurancePlan): Promise<InsurancePlan>
  update(plan: InsurancePlan): Promise<InsurancePlan>
}
