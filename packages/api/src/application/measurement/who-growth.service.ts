import type { PatientRepository } from '../../domain/patient/patient.repository.js'
import type { MeasurementRepository } from '../../domain/measurement/measurement.repository.js'
import {
  ageMonthsAt,
  buildReferenceCurve,
  estimatePercentile,
  metricFromTypeCode,
  referenceAtAge,
  resolveWhoGender,
  type WhoGender,
  type WhoMetric,
} from '../../domain/measurement/who-growth-reference.js'

export type WhoGrowthPoint = {
  ageMonths: number
  value: number
  observedAt: string
  percentile: number | null
  observationId?: string
}

export type WhoGrowthPayload = {
  typeCode: WhoMetric
  unit: string
  gender: WhoGender
  percentilesAvailable: true
  patientPoints: WhoGrowthPoint[]
  referenceCurve: Array<{ ageMonths: number; p3: number; p50: number; p97: number }>
}

export class WhoGrowthService {
  constructor(
    private readonly patients: PatientRepository,
    private readonly measurements: MeasurementRepository,
  ) {}

  async buildPayload(patientId: string, typeCode: string): Promise<WhoGrowthPayload | null> {
    const metric = metricFromTypeCode(typeCode)
    if (!metric) return null

    const patient = await this.patients.findById(patientId)
    if (!patient) return null

    const gender = resolveWhoGender(patient.gender)
    if (!gender) return null

    const birthDate = patient.birthDate
    const observations = await this.measurements.findObservations({
      patientId,
      typeCodes: [metric],
    })

    const patientPoints: WhoGrowthPoint[] = observations
      .filter((o) => o.valueNumeric != null)
      .map((o) => {
        const ageMonths = ageMonthsAt(birthDate, o.observedAt)
        const ref = referenceAtAge(gender, metric, ageMonths)
        const value = o.valueNumeric!
        return {
          ageMonths,
          value,
          observedAt: o.observedAt.toISOString(),
          percentile: Math.round(estimatePercentile(ref.p3, ref.p50, ref.p97, value)),
          observationId: o.id,
        }
      })
      .sort((a, b) => a.ageMonths - b.ageMonths)

    const maxAge = patientPoints.length
      ? Math.max(...patientPoints.map((p) => p.ageMonths))
      : ageMonthsAt(birthDate, new Date())
    const referenceCurve = buildReferenceCurve(gender, metric, 0, Math.min(60, maxAge + 3))

    const unit = metric === 'weight' ? 'kg' : 'cm'

    return {
      typeCode: metric,
      unit,
      gender,
      percentilesAvailable: true,
      patientPoints,
      referenceCurve,
    }
  }

  percentileForObservation(
    birthDate: Date,
    gender: string | null,
    typeCode: string,
    observedAt: Date,
    value: number,
  ): number | null {
    const g = resolveWhoGender(gender)
    const metric = metricFromTypeCode(typeCode)
    if (!g || !metric) return null
    const ageMonths = ageMonthsAt(birthDate, observedAt)
    if (ageMonths < 0 || ageMonths > 60) return null
    const ref = referenceAtAge(g, metric, ageMonths)
    return Math.round(estimatePercentile(ref.p3, ref.p50, ref.p97, value))
  }

  async enrichContext(
    patientId: string,
    typeCode: string,
    observedAt: Date,
    value: number,
    context: Record<string, unknown> = {},
  ): Promise<Record<string, unknown>> {
    const patient = await this.patients.findById(patientId)
    if (!patient) return context
    const pct = this.percentileForObservation(
      patient.birthDate,
      patient.gender,
      typeCode,
      observedAt,
      value,
    )
    if (pct == null) return context
    return { ...context, whoPercentile: pct }
  }
}
