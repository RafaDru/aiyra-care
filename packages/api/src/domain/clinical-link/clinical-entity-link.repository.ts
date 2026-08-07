import type { ClinicalEntityLink } from './clinical-entity-link.entity.js'
import type { ClinicalEntityType } from './clinical-entity-type.js'

export interface ClinicalEntityLinkFilter {
  patientId: string
  entityType?: ClinicalEntityType
  entityId?: string
  healthThreadId?: string
}

export interface ClinicalEntityLinkRepository {
  create(link: ClinicalEntityLink): Promise<ClinicalEntityLink>
  delete(id: string): Promise<void>
  findById(id: string): Promise<ClinicalEntityLink | null>
  findMany(filter: ClinicalEntityLinkFilter): Promise<ClinicalEntityLink[]>
  countByEntities(patientId: string): Promise<Array<{ entityType: string; entityId: string; count: number }>>
}
