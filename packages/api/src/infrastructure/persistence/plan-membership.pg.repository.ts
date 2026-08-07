import type { Pool } from 'pg'
import type { PlanMembershipRepository, PlanMembershipFilter } from '../../domain/insurance-plan/plan-membership.repository.js'
import { PlanMembership } from '../../domain/insurance-plan/plan-membership.entity.js'

const COLUMNS = `id, patient_id, insurance_plan_id, integration_link_id, member_number, role, status,
  cns, inclusion_date, card_valid_from, card_valid_to, source, last_synced_at, created_at, updated_at`

function rowToEntity(row: Record<string, unknown>): PlanMembership {
  return PlanMembership.restore({
    id: row.id as string,
    patientId: row.patient_id as string,
    insurancePlanId: row.insurance_plan_id as string,
    integrationLinkId: row.integration_link_id as string | null,
    memberNumber: row.member_number as string | null,
    role: row.role as string,
    status: row.status as string,
    cns: row.cns as string | null,
    inclusionDate: row.inclusion_date as Date | null,
    cardValidFrom: row.card_valid_from as Date | null,
    cardValidTo: row.card_valid_to as Date | null,
    source: row.source as string,
    lastSyncedAt: row.last_synced_at as Date | null,
    createdAt: row.created_at as Date,
    updatedAt: row.updated_at as Date,
  })
}

export class PlanMembershipPgRepository implements PlanMembershipRepository {
  constructor(private readonly pool: Pool) {}

  async findById(id: string) {
    const { rows } = await this.pool.query(`SELECT ${COLUMNS} FROM plan_memberships WHERE id = $1`, [id])
    return rows.length ? rowToEntity(rows[0]) : null
  }

  async findByPatientAndMember(patientId: string, insurancePlanId: string, memberNumber: string | null) {
    const { rows } = await this.pool.query(
      `SELECT ${COLUMNS} FROM plan_memberships
       WHERE patient_id = $1 AND insurance_plan_id = $2
         AND COALESCE(member_number, '') = COALESCE($3, '')`,
      [patientId, insurancePlanId, memberNumber],
    )
    return rows.length ? rowToEntity(rows[0]) : null
  }

  async findAll(filter?: PlanMembershipFilter) {
    const conditions: string[] = []
    const params: unknown[] = []
    if (filter?.patientId) conditions.push('patient_id = $' + params.push(filter.patientId))
    if (filter?.insurancePlanId) conditions.push('insurance_plan_id = $' + params.push(filter.insurancePlanId))
    if (filter?.status) conditions.push('status = $' + params.push(filter.status))
    const where = conditions.length ? 'WHERE ' + conditions.join(' AND ') : ''
    const { rows } = await this.pool.query(
      `SELECT ${COLUMNS} FROM plan_memberships ${where} ORDER BY status ASC, updated_at DESC`,
      params,
    )
    return rows.map(rowToEntity)
  }

  async save(membership: PlanMembership) {
    const d = membership.toJSON()
    const { rows } = await this.pool.query(
      `INSERT INTO plan_memberships (
         id, patient_id, insurance_plan_id, integration_link_id, member_number, role, status,
         cns, inclusion_date, card_valid_from, card_valid_to, source, last_synced_at
       ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)
       RETURNING ${COLUMNS}`,
      [
        d.id, d.patientId, d.insurancePlanId, d.integrationLinkId, d.memberNumber, d.role, d.status,
        d.cns, d.inclusionDate, d.cardValidFrom, d.cardValidTo, d.source, d.lastSyncedAt,
      ],
    )
    return rowToEntity(rows[0])
  }

  async update(membership: PlanMembership) {
    const d = membership.toJSON()
    const { rows } = await this.pool.query(
      `UPDATE plan_memberships SET
         integration_link_id=$1, member_number=$2, role=$3, status=$4, cns=$5,
         inclusion_date=$6, card_valid_from=$7, card_valid_to=$8, source=$9,
         last_synced_at=$10, updated_at=NOW()
       WHERE id=$11 RETURNING ${COLUMNS}`,
      [
        d.integrationLinkId, d.memberNumber, d.role, d.status, d.cns,
        d.inclusionDate, d.cardValidFrom, d.cardValidTo, d.source, d.lastSyncedAt, d.id,
      ],
    )
    if (!rows.length) throw new Error('PlanMembership ' + membership.id + ' not found')
    return rowToEntity(rows[0])
  }

  async delete(id: string) {
    await this.pool.query('DELETE FROM plan_memberships WHERE id = $1', [id])
  }
}
