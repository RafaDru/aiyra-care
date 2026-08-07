import type { RelationType } from './relation-type.entity.js'

export interface RelationTypeRepository {
  findAll(): Promise<RelationType[]>
  findByCode(code: string): Promise<RelationType | null>
}
