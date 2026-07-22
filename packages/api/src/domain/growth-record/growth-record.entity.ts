export interface GrowthRecordProps {
  patientId: string
  recordDate: Date
  weightKg?: number
  heightCm?: number
  headCircumferenceCm?: number
  bmi?: number
  percentileWeight?: number
  percentileHeight?: number
  notes?: string
}

export interface GrowthRecordData {
  id: string
  patientId: string
  recordDate: Date
  weightKg: number | null
  heightCm: number | null
  headCircumferenceCm: number | null
  bmi: number | null
  percentileWeight: number | null
  percentileHeight: number | null
  notes: string | null
  createdAt: Date
}

export class GrowthRecord {
  private constructor(private readonly data: GrowthRecordData) {}

  static create(props: GrowthRecordProps, id?: string): GrowthRecord {
    return new GrowthRecord({
      id: id ?? crypto.randomUUID(),
      patientId: props.patientId,
      recordDate: props.recordDate,
      weightKg: props.weightKg ?? null,
      heightCm: props.heightCm ?? null,
      headCircumferenceCm: props.headCircumferenceCm ?? null,
      bmi: props.bmi ?? null,
      percentileWeight: props.percentileWeight ?? null,
      percentileHeight: props.percentileHeight ?? null,
      notes: props.notes ?? null,
      createdAt: new Date(),
    })
  }

  static restore(data: GrowthRecordData): GrowthRecord {
    return new GrowthRecord(data)
  }

  get id(): string { return this.data.id }
  get patientId(): string { return this.data.patientId }
  get recordDate(): Date { return this.data.recordDate }
  get weightKg(): number | null { return this.data.weightKg }
  get heightCm(): number | null { return this.data.heightCm }
  get headCircumferenceCm(): number | null { return this.data.headCircumferenceCm }
  get bmi(): number | null { return this.data.bmi }
  get percentileWeight(): number | null { return this.data.percentileWeight }
  get percentileHeight(): number | null { return this.data.percentileHeight }
  get notes(): string | null { return this.data.notes }
  get createdAt(): Date { return this.data.createdAt }

  toJSON(): GrowthRecordData { return { ...this.data } }
}
