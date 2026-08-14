export type MeasurementSource =
  | 'manual'
  | 'import'
  | 'device'
  | 'computed'
  | 'legacy_growth'

export interface MeasurementObservationProps {
  patientId: string
  typeCode: string
  observedAt: Date
  valueNumeric?: number | null
  valueSecondary?: number | null
  unit?: string | null
  source?: MeasurementSource
  sourceRef?: string | null
  healthThreadId?: string | null
  context?: Record<string, unknown>
  notes?: string | null
}

export interface MeasurementObservationData {
  id: string
  patientId: string
  typeCode: string
  observedAt: Date
  valueNumeric: number | null
  valueSecondary: number | null
  unit: string | null
  source: MeasurementSource
  sourceRef: string | null
  healthThreadId: string | null
  context: Record<string, unknown>
  notes: string | null
  createdAt: Date
}

export class MeasurementObservation {
  private constructor(private readonly data: MeasurementObservationData) {}

  static create(props: MeasurementObservationProps, id?: string): MeasurementObservation {
    return new MeasurementObservation({
      id: id ?? crypto.randomUUID(),
      patientId: props.patientId,
      typeCode: props.typeCode,
      observedAt: props.observedAt,
      valueNumeric: props.valueNumeric ?? null,
      valueSecondary: props.valueSecondary ?? null,
      unit: props.unit ?? null,
      source: props.source ?? 'manual',
      sourceRef: props.sourceRef ?? null,
      healthThreadId: props.healthThreadId ?? null,
      context: props.context ?? {},
      notes: props.notes ?? null,
      createdAt: new Date(),
    })
  }

  static restore(data: MeasurementObservationData): MeasurementObservation {
    return new MeasurementObservation(data)
  }

  get id(): string { return this.data.id }
  get patientId(): string { return this.data.patientId }
  get typeCode(): string { return this.data.typeCode }
  get observedAt(): Date { return this.data.observedAt }
  get valueNumeric(): number | null { return this.data.valueNumeric }
  get valueSecondary(): number | null { return this.data.valueSecondary }
  get unit(): string | null { return this.data.unit }
  get source(): MeasurementSource { return this.data.source }
  get sourceRef(): string | null { return this.data.sourceRef }
  get healthThreadId(): string | null { return this.data.healthThreadId }
  get context(): Record<string, unknown> { return this.data.context }
  get notes(): string | null { return this.data.notes }
  get createdAt(): Date { return this.data.createdAt }

  toJSON(): MeasurementObservationData { return { ...this.data } }
}
