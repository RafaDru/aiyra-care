export interface VaccineProps {
  patientId: string
  vaccineName: string
  doseNumber?: number
  batchNumber?: string
  applicationDate: Date
  nextDoseDate?: Date
  appliedBy?: string
  clinic?: string
  notes?: string
}

export interface VaccineData {
  id: string
  patientId: string
  vaccineName: string
  doseNumber: number | null
  batchNumber: string | null
  applicationDate: Date
  nextDoseDate: Date | null
  appliedBy: string | null
  clinic: string | null
  notes: string | null
  createdAt: Date
}

export class Vaccine {
  private constructor(private readonly data: VaccineData) {}

  static create(props: VaccineProps, id?: string): Vaccine {
    return new Vaccine({
      id: id ?? crypto.randomUUID(),
      patientId: props.patientId,
      vaccineName: props.vaccineName,
      doseNumber: props.doseNumber ?? null,
      batchNumber: props.batchNumber ?? null,
      applicationDate: props.applicationDate,
      nextDoseDate: props.nextDoseDate ?? null,
      appliedBy: props.appliedBy ?? null,
      clinic: props.clinic ?? null,
      notes: props.notes ?? null,
      createdAt: new Date(),
    })
  }

  static restore(data: VaccineData): Vaccine { return new Vaccine(data) }

  get id(): string { return this.data.id }
  get patientId(): string { return this.data.patientId }
  get vaccineName(): string { return this.data.vaccineName }
  get doseNumber(): number | null { return this.data.doseNumber }
  get batchNumber(): string | null { return this.data.batchNumber }
  get applicationDate(): Date { return this.data.applicationDate }
  get nextDoseDate(): Date | null { return this.data.nextDoseDate }
  get appliedBy(): string | null { return this.data.appliedBy }
  get clinic(): string | null { return this.data.clinic }
  get notes(): string | null { return this.data.notes }
  get createdAt(): Date { return this.data.createdAt }

  toJSON(): VaccineData { return { ...this.data } }
}
