import type { Pool } from 'pg'
import type { InsurancePlanRepository, InsurancePlanFilter } from '../../domain/insurance-plan/insurance-plan.repository.js'
import { InsurancePlan } from '../../domain/insurance-plan/insurance-plan.entity.js'
import type { PlanAddOn, PlanWaitingPeriod } from '../../domain/insurance-plan/insurance-plan.entity.js'

const COLUMNS = `id, operator, operator_name, plan_name, product_code, network_name, network_code,
  segmentation, accommodation, geographic_coverage, regulation_type, contract_type, contractor_name,
  add_ons, waiting_periods, external_key, source, raw, created_at, updated_at`

function rowToEntity(row: Record<string, unknown>): InsurancePlan {
  return InsurancePlan.restore({
    id: row.id as string,
    operator: row.operator as string,
    operatorName: row.operator_name as string | null,
    planName: row.plan_name as string,
    productCode: row.product_code as string | null,
    networkName: row.network_name as string | null,
    networkCode: row.network_code as string | null,
    segmentation: row.segmentation as string | null,
    accommodation: row.accommodation as string | null,
    geographicCoverage: row.geographic_coverage as string | null,
    regulationType: row.regulation_type as string | null,
    contractType: row.contract_type as string | null,
    contractorName: row.contractor_name as string | null,
    addOns: (row.add_ons as PlanAddOn[]) ?? [],
    waitingPeriods: (row.waiting_periods as PlanWaitingPeriod[]) ?? [],
    externalKey: row.external_key as string,
    source: row.source as string,
    raw: (row.raw as Record<string, unknown> | null) ?? null,
    createdAt: row.created_at as Date,
    updatedAt: row.updated_at as Date,
  })
}

export class InsurancePlanPgRepository implements InsurancePlanRepository {
  constructor(private readonly pool: Pool) {}

  async findById(id: string) {
    const { rows } = await this.pool.query(`SELECT ${COLUMNS} FROM insurance_plans WHERE id = $1`, [id])
    return rows.length ? rowToEntity(rows[0]) : null
  }

  async findByExternalKey(operator: string, externalKey: string) {
    const { rows } = await this.pool.query(
      `SELECT ${COLUMNS} FROM insurance_plans WHERE operator = $1 AND external_key = $2`,
      [operator, externalKey],
    )
    return rows.length ? rowToEntity(rows[0]) : null
  }

  async findAll(filter?: InsurancePlanFilter) {
    const conditions: string[] = []
    const params: unknown[] = []
    if (filter?.operator) conditions.push('operator = $' + params.push(filter.operator))
    const where = conditions.length ? 'WHERE ' + conditions.join(' AND ') : ''
    const { rows } = await this.pool.query(
      `SELECT ${COLUMNS} FROM insurance_plans ${where} ORDER BY plan_name ASC`,
      params,
    )
    return rows.map(rowToEntity)
  }

  async save(plan: InsurancePlan) {
    const d = plan.toJSON()
    const { rows } = await this.pool.query(
      `INSERT INTO insurance_plans (
         id, operator, operator_name, plan_name, product_code, network_name, network_code,
         segmentation, accommodation, geographic_coverage, regulation_type, contract_type, contractor_name,
         add_ons, waiting_periods, external_key, source, raw
       ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14::jsonb,$15::jsonb,$16,$17,$18::jsonb)
       RETURNING ${COLUMNS}`,
      [
        d.id, d.operator, d.operatorName, d.planName, d.productCode, d.networkName, d.networkCode,
        d.segmentation, d.accommodation, d.geographicCoverage, d.regulationType, d.contractType, d.contractorName,
        JSON.stringify(d.addOns), JSON.stringify(d.waitingPeriods), d.externalKey, d.source, d.raw ? JSON.stringify(d.raw) : null,
      ],
    )
    return rowToEntity(rows[0])
  }

  async update(plan: InsurancePlan) {
    const d = plan.toJSON()
    const { rows } = await this.pool.query(
      `UPDATE insurance_plans SET
         operator_name=$1, plan_name=$2, product_code=$3, network_name=$4, network_code=$5,
         segmentation=$6, accommodation=$7, geographic_coverage=$8, regulation_type=$9,
         contract_type=$10, contractor_name=$11, add_ons=$12::jsonb, waiting_periods=$13::jsonb,
         source=$14, raw=$15::jsonb, updated_at=NOW()
       WHERE id=$16 RETURNING ${COLUMNS}`,
      [
        d.operatorName, d.planName, d.productCode, d.networkName, d.networkCode,
        d.segmentation, d.accommodation, d.geographicCoverage, d.regulationType,
        d.contractType, d.contractorName, JSON.stringify(d.addOns), JSON.stringify(d.waitingPeriods),
        d.source, d.raw ? JSON.stringify(d.raw) : null, d.id,
      ],
    )
    if (!rows.length) throw new Error('InsurancePlan ' + plan.id + ' not found')
    return rowToEntity(rows[0])
  }
}
