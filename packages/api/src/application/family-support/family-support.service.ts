import type { MeasurementRepository } from '../../domain/measurement/measurement.repository.js'
import type { AllergyRepository } from '../../domain/allergy/allergy.repository.js'
import type { MedicationRepository } from '../../domain/medication/medication.repository.js'
import type { FamilySupportBundle } from '../../domain/family-support/family-support.types.js'
import { evaluateMedicationSafety, evaluateVitalRules } from './family-support-rules.js'

const DISCLAIMER =
  'Apoio à família para organizar informações e conversar com o pediatra. Não substitui consulta médica nem serviço de emergência. Em emergência, ligue 192 (SAMU).'

const VITAL_CODES = ['temperature', 'heart_rate', 'spo2'] as const

export class FamilySupportService {
  constructor(
    private readonly measurements: MeasurementRepository,
    private readonly allergies: AllergyRepository,
    private readonly medications: MedicationRepository,
  ) {}

  async buildInsights(
    patientId: string,
    opts?: { medicationName?: string; healthThreadId?: string },
  ): Promise<FamilySupportBundle> {
    const types = await this.measurements.listTypes(true)
    const typeMap = new Map(types.map((t) => [t.code, t]))

    const observations = await this.measurements.findObservations({
      patientId,
      typeCodes: [...VITAL_CODES],
      healthThreadId: opts?.healthThreadId,
    })

    const latestByType = new Map<string, typeof observations[number]>()
    for (const obs of observations) {
      const prev = latestByType.get(obs.typeCode)
      if (!prev || obs.observedAt > prev.observedAt) {
        latestByType.set(obs.typeCode, obs)
      }
    }

    const vitalInputs = VITAL_CODES.flatMap((code) => {
      const obs = latestByType.get(code)
      const type = typeMap.get(code)
      if (!obs || obs.valueNumeric == null || !type) return []
      const range = type.normalRange
      return [{
        typeCode: code,
        label: type.labelKey,
        unit: obs.unit ?? type.defaultUnit,
        value: obs.valueNumeric,
        observedAt: obs.observedAt,
        observationId: obs.id,
        criticalLow: range?.criticalLow,
        criticalHigh: range?.criticalHigh,
      }]
    })

    const allergyRows = await this.allergies.findAll({ patientId })
    const medRows = await this.medications.findAll({ patientId })
    const activeMeds = medRows.filter((m) => m.isActive)

    const insights = [
      ...evaluateVitalRules(vitalInputs),
      ...(opts?.medicationName
        ? evaluateMedicationSafety(
          opts.medicationName,
          allergyRows.map((a) => ({
            id: a.id,
            allergen: a.allergen,
            reaction: a.reaction,
          })),
          activeMeds.map((m) => ({
            id: m.id,
            genericName: m.genericName,
            brandName: m.brandName,
          })),
        )
        : []),
    ]

    const priorityOrder = { critical: 0, urgent: 1, attention: 2, info: 3 }
    insights.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority])

    return {
      disclaimer: DISCLAIMER,
      insights,
      generatedAt: new Date().toISOString(),
      patientId,
    }
  }
}
