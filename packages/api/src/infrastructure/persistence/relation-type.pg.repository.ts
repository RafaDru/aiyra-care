import type { Pool } from 'pg'
import { RelationType } from '../../domain/clinical-link/relation-type.entity.js'
import type { RelationTypeRepository } from '../../domain/clinical-link/relation-type.repository.js'

const COLUMNS =
  'code, label, from_entity_type, to_entity_type, neo4j_rel_type, description, inverse_label'

function mapRow(row: Record<string, unknown>): RelationType {
  return RelationType.restore({
    code: row.code as string,
    label: row.label as string,
    fromEntityType: row.from_entity_type as string,
    toEntityType: row.to_entity_type as string,
    neo4jRelType: row.neo4j_rel_type as string,
    description: (row.description as string | null) ?? null,
    inverseLabel: (row.inverse_label as string | null) ?? null,
  })
}

export class RelationTypePgRepository implements RelationTypeRepository {
  constructor(private readonly pool: Pool) {}

  async findAll(): Promise<RelationType[]> {
    const { rows } = await this.pool.query(`SELECT ${COLUMNS} FROM relation_types ORDER BY code`)
    return rows.map(mapRow)
  }

  async findByCode(code: string): Promise<RelationType | null> {
    const { rows } = await this.pool.query(
      `SELECT ${COLUMNS} FROM relation_types WHERE code = $1`,
      [code],
    )
    return rows[0] ? mapRow(rows[0]) : null
  }
}
