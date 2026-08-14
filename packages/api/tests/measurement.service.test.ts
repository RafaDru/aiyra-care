import { describe, it, expect, vi, beforeEach } from 'vitest'
import { MeasurementService } from '../src/application/measurement/measurement.service.js'
import { MeasurementType } from '../src/domain/measurement/measurement-type.entity.js'
import { MeasurementObservation } from '../src/domain/measurement/measurement-observation.entity.js'

const types = [
  MeasurementType.restore({
    code: 'temperature',
    category: 'vital_sign',
    labelKey: 'measurement.type.temperature',
    defaultUnit: '°C',
    valueKind: 'scalar',
    precision: 1,
    normalRange: null,
    chartConfig: { enabled: true, chartKind: 'line', color: '#fa541c' },
    sortOrder: 10,
    active: true,
  }),
  MeasurementType.restore({
    code: 'heart_rate',
    category: 'vital_sign',
    labelKey: 'measurement.type.heart_rate',
    defaultUnit: 'bpm',
    valueKind: 'scalar',
    precision: 0,
    normalRange: null,
    chartConfig: { enabled: true, chartKind: 'line' },
    sortOrder: 11,
    active: true,
  }),
  MeasurementType.restore({
    code: 'vomit',
    category: 'symptom',
    labelKey: 'measurement.type.vomit',
    defaultUnit: null,
    valueKind: 'occurrence',
    precision: 0,
    normalRange: null,
    chartConfig: { enabled: false },
    sortOrder: 40,
    active: true,
  }),
]

function makeRepo() {
  const observations: MeasurementObservation[] = []
  return {
    listTypes: vi.fn(async () => types),
    findTypeByCode: vi.fn(async (code: string) => types.find((t) => t.code === code) ?? null),
    findObservationById: vi.fn(),
    findObservations: vi.fn(async () => observations),
    saveObservation: vi.fn(async (o: MeasurementObservation) => {
      observations.push(o)
      return o
    }),
    deleteObservation: vi.fn(),
    findAdministrationById: vi.fn(),
    findAdministrations: vi.fn(async () => []),
    saveAdministration: vi.fn(),
    deleteAdministration: vi.fn(),
  }
}

describe('MeasurementService', () => {
  let repo: ReturnType<typeof makeRepo>
  let service: MeasurementService

  beforeEach(() => {
    repo = makeRepo()
    service = new MeasurementService(repo as never)
  })

  it('createObservationBatch saves multiple vitals', async () => {
    const at = new Date('2026-08-14T10:00:00Z')
    const saved = await service.createObservationBatch('patient-1', at, [
      { typeCode: 'temperature', valueNumeric: 38.2 },
      { typeCode: 'heart_rate', valueNumeric: 110 },
    ])
    expect(saved.length).toBe(2)
    expect(repo.saveObservation).toHaveBeenCalledTimes(2)
  })

  it('chartSeries excludes disabled chart types', async () => {
    const at = new Date('2026-08-14T10:00:00Z')
    await service.createObservationBatch('patient-1', at, [
      { typeCode: 'temperature', valueNumeric: 37.5 },
    ])
    await service.createObservation({
      patientId: 'patient-1',
      typeCode: 'vomit',
      observedAt: at,
      valueNumeric: 1,
    })
    const series = await service.chartSeries('patient-1')
    expect(series.length).toBe(1)
    expect(series[0].typeCode).toBe('temperature')
  })
})
