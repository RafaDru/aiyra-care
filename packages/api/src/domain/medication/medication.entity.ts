export interface MedicationProps {
  patientId: string
  medicalRecordId?: string
  genericName: string
  brandName?: string
  dosage?: string
  frequency?: string
  route?: string
  duration?: string
  startDate?: Date
  startedAt?: Date
  endDate?: Date
  endDateIsProjected?: boolean
  prescribingDoctor?: string
  notes?: string
  isActive?: boolean
}

export interface MedicationData {
  id: string
  patientId: string
  medicalRecordId: string | null
  genericName: string
  brandName: string | null
  dosage: string | null
  frequency: string | null
  route: string | null
  duration: string | null
  startDate: Date | null
  startedAt: Date | null
  endDate: Date | null
  endDateIsProjected: boolean
  prescribingDoctor: string | null
  notes: string | null
  isActive: boolean
  createdAt: Date
}

export class Medication {
  private constructor(private readonly data: MedicationData) {}

  static create(props: MedicationProps, id?: string): Medication {
    return new Medication({
      id: id ?? crypto.randomUUID(),
      patientId: props.patientId,
      medicalRecordId: props.medicalRecordId ?? null,
      genericName: props.genericName,
      brandName: props.brandName ?? null,
      dosage: props.dosage ?? null,
      frequency: props.frequency ?? null,
      route: props.route ?? null,
      duration: props.duration ?? null,
      startDate: props.startDate ?? null,
      startedAt: props.startedAt ?? null,
      endDate: props.endDate ?? null,
      endDateIsProjected: props.endDateIsProjected ?? false,
      prescribingDoctor: props.prescribingDoctor ?? null,
      notes: props.notes ?? null,
      isActive: props.isActive ?? true,
      createdAt: new Date(),
    })
  }

  static restore(data: MedicationData): Medication { return new Medication(data) }

  get id(): string { return this.data.id }
  get patientId(): string { return this.data.patientId }
  get medicalRecordId(): string | null { return this.data.medicalRecordId }
  get genericName(): string { return this.data.genericName }
  get brandName(): string | null { return this.data.brandName }
  get dosage(): string | null { return this.data.dosage }
  get frequency(): string | null { return this.data.frequency }
  get route(): string | null { return this.data.route }
  get duration(): string | null { return this.data.duration }
  get startDate(): Date | null { return this.data.startDate }
  get startedAt(): Date | null { return this.data.startedAt }
  get endDate(): Date | null { return this.data.endDate }
  get endDateIsProjected(): boolean { return this.data.endDateIsProjected }
  get prescribingDoctor(): string | null { return this.data.prescribingDoctor }
  get notes(): string | null { return this.data.notes }
  get isActive(): boolean { return this.data.isActive }
  get createdAt(): Date { return this.data.createdAt }

  toJSON(): MedicationData { return { ...this.data } }
}
