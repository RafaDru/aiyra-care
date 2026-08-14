import type { Pool } from 'pg'
import type {
  MeasurementRepository,
  MeasurementObservationFilter,
  MedicationAdministrationFilter,
} from '../../domain/measurement/measurement.repository.js'
import { MeasurementType } from '../../domain/measurement/measurement-type.entity.js'
import type { MeasurementTypeData, MeasurementChartConfig, MeasurementNormalRange } from '../../domain/measurement/measurement-type.entity.js'
import { MeasurementObservation } from '../../domain/measurement/measurement-observation.entity.js'
import type { MeasurementObservationData, MeasurementSource } from '../../domain/measurement/measurement-observation.entity.js'
import { MedicationAdministration } from '../../domain/measurement/medication-administration.entity.js'
import type { MedicationAdministrationData } from '../../domain/measurement/medication-administration.entity.js'

const TYPE_COLS = 'code, category, label_key, default_unit, value_kind, precision, normal_range, chart_config, sort_order, active'

const OBS_COLS = 'id, patient_id, type_code, observed_at, value_numeric, value_secondary, unit, source, source_ref, health_thread_id, context, notes, created_at'

const ADMIN_COLS = 'id, patient_id, medication_id, medication_name, administered_at, dose_given, health_thread_id, notes, created_at'

function parseJson<T>(v: unknown, fallback: T): T {
  if (v == null) return fallback
  if (typeof v === 'object') return v as T
  try { return JSON.parse(String(v)) as T } catch { return fallback }
}

function rowToType(row: Record<string, unknown>): MeasurementType {
  return MeasurementType.restore({
    code: row.code as string,
    category: row.category as MeasurementTypeData['category'],
    labelKey: row.label_key as string,
    defaultUnit: row.default_unit as string | null,
    valueKind: row.value_kind as MeasurementTypeData['valueKind'],
    precision: Number(row.precision),
    normalRange: parseJson<MeasurementNormalRange | null>(row.normal_range, null),
    chartConfig: parseJson<MeasurementChartConfig>(row.chart_config, { enabled: false }),
    sortOrder: Number(row.sort_order),
    active: Boolean(row.active),
  })
}

function rowToObservation(row: Record<string, unknown>): MeasurementObservation {
  return MeasurementObservation.restore({
    id: row.id as string,
    patientId: row.patient_id as string,
    typeCode: row.type_code as string,
    observedAt: row.observed_at as Date,
    valueNumeric: row.value_numeric != null ? Number(row.value_numeric) : null,
    valueSecondary: row.value_secondary != null ? Number(row.value_secondary) : null,
    unit: row.unit as string | null,
    source: row.source as MeasurementSource,
    sourceRef: row.source_ref as string | null,
    healthThreadId: row.health_thread_id as string | null,
    context: parseJson<Record<string, unknown>>(row.context, {}),
    notes: row.notes as string | null,
    createdAt: row.created_at as Date,
  })
}

function rowToAdmin(row: Record<string, unknown>): MedicationAdministration {
  return MedicationAdministration.restore({
    id: row.id as string,
    patientId: row.patient_id as string,
    medicationId: row.medication_id as string | null,
    medicationName: row.medication_name as string,
    administeredAt: row.administered_at as Date,
    doseGiven: row.dose_given as string | null,
    healthThreadId: row.health_thread_id as string | null,
    notes: row.notes as string | null,
    createdAt: row.created_at as Date,
  })
}

export class MeasurementPgRepository implements MeasurementRepository {
  constructor(private readonly pool: Pool) {}

  async listTypes(activeOnly = true) {
    const where = activeOnly ? 'WHERE active = true' : ''
    const { rows } = await this.pool.query(
      `SELECT ${TYPE_COLS} FROM measurement_types ${where} ORDER BY sort_order, code`,
    )
    return rows.map(rowToType)
  }

  async findTypeByCode(code: string) {
    const { rows } = await this.pool.query(`SELECT ${TYPE_COLS} FROM measurement_types WHERE code = $1`, [code])
    return rows.length ? rowToType(rows[0]) : null
  }

  async findObservationById(id: string) {
    const { rows } = await this.pool.query(`SELECT ${OBS_COLS} FROM measurement_observations WHERE id = $1`, [id])
    return rows.length ? rowToObservation(rows[0]) : null
  }

  async findObservations(filter?: MeasurementObservationFilter) {
    const conditions: string[] = []
    const params: unknown[] = []
    let fromClause = 'measurement_observations o'
    if (filter?.categories?.length) {
      fromClause += ' JOIN measurement_types t ON t.code = o.type_code'
      conditions.push(`t.category = ANY($${params.push(filter.categories)})`)
    }
    if (filter?.patientId) conditions.push(`o.patient_id = $${params.push(filter.patientId)}`)
    if (filter?.healthThreadId) conditions.push(`o.health_thread_id = $${params.push(filter.healthThreadId)}`)
    if (filter?.typeCodes?.length) conditions.push(`o.type_code = ANY($${params.push(filter.typeCodes)})`)
    if (filter?.from) conditions.push(`o.observed_at >= $${params.push(filter.from)}`)
    if (filter?.to) conditions.push(`o.observed_at <= $${params.push(filter.to)}`)
    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : ''
    const { rows } = await this.pool.query(
      `SELECT o.id, o.patient_id, o.type_code, o.observed_at, o.value_numeric, o.value_secondary, o.unit, o.source, o.source_ref, o.health_thread_id, o.context, o.notes, o.created_at
       FROM ${fromClause} ${where} ORDER BY o.observed_at DESC`,
      params,
    )
    return rows.map(rowToObservation)
  }

  async saveObservation(obs: MeasurementObservation) {
    const d = obs.toJSON()
    const { rows } = await this.pool.query(
      `INSERT INTO measurement_observations
       (id, patient_id, type_code, observed_at, value_numeric, value_secondary, unit, source, source_ref, health_thread_id, context, notes)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11::jsonb,$12) RETURNING ${OBS_COLS}`,
      [
        d.id, d.patientId, d.typeCode, d.observedAt, d.valueNumeric, d.valueSecondary, d.unit,
        d.source, d.sourceRef, d.healthThreadId, JSON.stringify(d.context), d.notes,
      ],
    )
    return rowToObservation(rows[0])
  }

  async deleteObservation(id: string) {
    await this.pool.query('DELETE FROM measurement_observations WHERE id = $1', [id])
  }

  async findAdministrationById(id: string) {
    const { rows } = await this.pool.query(`SELECT ${ADMIN_COLS} FROM medication_administrations WHERE id = $1`, [id])
    return rows.length ? rowToAdmin(rows[0]) : null
  }

  async findAdministrations(filter?: MedicationAdministrationFilter) {
    const conditions: string[] = []
    const params: unknown[] = []
    if (filter?.patientId) conditions.push(`patient_id = $${params.push(filter.patientId)}`)
    if (filter?.healthThreadId) conditions.push(`health_thread_id = $${params.push(filter.healthThreadId)}`)
    if (filter?.from) conditions.push(`administered_at >= $${params.push(filter.from)}`)
    if (filter?.to) conditions.push(`administered_at <= $${params.push(filter.to)}`)
    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : ''
    const { rows } = await this.pool.query(
      `SELECT ${ADMIN_COLS} FROM medication_administrations ${where} ORDER BY administered_at DESC`,
      params,
    )
    return rows.map(rowToAdmin)
  }

  async saveAdministration(row: MedicationAdministration) {
    const d = row.toJSON()
    const { rows } = await this.pool.query(
      `INSERT INTO medication_administrations
       (id, patient_id, medication_id, medication_name, administered_at, dose_given, health_thread_id, notes)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING ${ADMIN_COLS}`,
      [d.id, d.patientId, d.medicationId, d.medicationName, d.administeredAt, d.doseGiven, d.healthThreadId, d.notes],
    )
    return rowToAdmin(rows[0])
  }

  async deleteAdministration(id: string) {
    await this.pool.query('DELETE FROM medication_administrations WHERE id = $1', [id])
  }
}
