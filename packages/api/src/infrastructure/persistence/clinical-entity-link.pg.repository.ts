import type { Pool } from 'pg'
import { ClinicalEntityLink } from '../../domain/clinical-link/clinical-entity-link.entity.js'
import type {
  ClinicalEntityLinkFilter,
  ClinicalEntityLinkRepository,
} from '../../domain/clinical-link/clinical-entity-link.repository.js'

const COLUMNS =
  'id, patient_id, from_entity_type, from_entity_id, to_entity_type, to_entity_id, relation_code, label, health_thread_id, metadata, created_by, created_at'

function mapRow(row: Record<string, unknown>): ClinicalEntityLink {
  return ClinicalEntityLink.restore({
    id: row.id as string,
    patientId: row.patient_id as string,
    fromEntityType: row.from_entity_type as ClinicalEntityLink['fromEntityType'],
    fromEntityId: row.from_entity_id as string,
    toEntityType: row.to_entity_type as ClinicalEntityLink['toEntityType'],
    toEntityId: row.to_entity_id as string,
    relationCode: row.relation_code as string,
    label: (row.label as string | null) ?? null,
    healthThreadId: (row.health_thread_id as string | null) ?? null,
    metadata: (row.metadata as Record<string, unknown>) ?? {},
    createdBy: (row.created_by as string | null) ?? null,
    createdAt: new Date(row.created_at as string),
  })
}

export class ClinicalEntityLinkPgRepository implements ClinicalEntityLinkRepository {
  constructor(private readonly pool: Pool) {}

  async create(link: ClinicalEntityLink): Promise<ClinicalEntityLink> {
    const d = link.toJSON()
    const { rows } = await this.pool.query(
      `INSERT INTO clinical_entity_links (
        id, patient_id, from_entity_type, from_entity_id, to_entity_type, to_entity_id,
        relation_code, label, health_thread_id, metadata, created_by, created_at
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
      RETURNING ${COLUMNS}`,
      [
        d.id,
        d.patientId,
        d.fromEntityType,
        d.fromEntityId,
        d.toEntityType,
        d.toEntityId,
        d.relationCode,
        d.label,
        d.healthThreadId,
        JSON.stringify(d.metadata),
        d.createdBy,
        d.createdAt,
      ],
    )
    return mapRow(rows[0])
  }

  async delete(id: string): Promise<void> {
    await this.pool.query('DELETE FROM clinical_entity_links WHERE id = $1', [id])
  }

  async findById(id: string): Promise<ClinicalEntityLink | null> {
    const { rows } = await this.pool.query(`SELECT ${COLUMNS} FROM clinical_entity_links WHERE id = $1`, [id])
    return rows[0] ? mapRow(rows[0]) : null
  }

  async findMany(filter: ClinicalEntityLinkFilter): Promise<ClinicalEntityLink[]> {
    const conditions = ['patient_id = $1']
    const params: unknown[] = [filter.patientId]

    if (filter.healthThreadId) {
      params.push(filter.healthThreadId)
      conditions.push(`health_thread_id = $${params.length}`)
    }

    if (filter.entityType && filter.entityId) {
      params.push(filter.entityType, filter.entityId)
      const idx = params.length
      conditions.push(
        `(from_entity_type = $${idx - 1} AND from_entity_id = $${idx} OR to_entity_type = $${idx - 1} AND to_entity_id = $${idx})`,
      )
    }

    const { rows } = await this.pool.query(
      `SELECT ${COLUMNS} FROM clinical_entity_links WHERE ${conditions.join(' AND ')} ORDER BY created_at ASC`,
      params,
    )
    return rows.map(mapRow)
  }

  async countByEntities(patientId: string): Promise<Array<{ entityType: string; entityId: string; count: number }>> {
    const { rows } = await this.pool.query(
      `SELECT entity_type, entity_id, COUNT(*)::int AS count FROM (
        SELECT from_entity_type AS entity_type, from_entity_id AS entity_id FROM clinical_entity_links WHERE patient_id = $1
        UNION ALL
        SELECT to_entity_type, to_entity_id FROM clinical_entity_links WHERE patient_id = $1
      ) AS refs
      GROUP BY entity_type, entity_id`,
      [patientId],
    )
    return rows.map((row) => ({
      entityType: row.entity_type as string,
      entityId: row.entity_id as string,
      count: row.count as number,
    }))
  }
}
