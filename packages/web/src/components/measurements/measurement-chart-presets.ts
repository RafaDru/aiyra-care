/** Presets médicos para comparar marcadores na mesma linha do tempo. */
export type MeasurementComparePreset = {
  id: string
  labelKey: string
  typeCodes: string[]
  descriptionKey?: string
}

export const MEASUREMENT_COMPARE_PRESETS: MeasurementComparePreset[] = [
  {
    id: 'fever_vitals',
    labelKey: 'measurement.compare.feverVitals',
    descriptionKey: 'measurement.compare.feverVitalsHint',
    typeCodes: ['temperature', 'heart_rate'],
  },
  {
    id: 'respiratory',
    labelKey: 'measurement.compare.respiratory',
    descriptionKey: 'measurement.compare.respiratoryHint',
    typeCodes: ['spo2', 'heart_rate'],
  },
  {
    id: 'blood_pressure',
    labelKey: 'measurement.compare.bloodPressure',
    typeCodes: ['blood_pressure'],
  },
]

export const MAX_COMPARE_SERIES = 3
