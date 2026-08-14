export interface MedicationAdministrationProps {
  patientId: string
  medicationId?: string | null
  medicationName: string
  administeredAt: Date
  doseGiven?: string | null
  healthThreadId?: string | null
  notes?: string | null
}

export interface MedicationAdministrationData {
  id: string
  patientId: string
  medicationId: string | null
  medicationName: string
  administeredAt: Date
  doseGiven: string | null
  healthThreadId: string | null
  notes: string | null
  createdAt: Date
}

export class MedicationAdministration {
  private constructor(private readonly data: MedicationAdministrationData) {}

  static create(props: MedicationAdministrationProps, id?: string): MedicationAdministration {
    return new MedicationAdministration({
      id: id ?? crypto.randomUUID(),
      patientId: props.patientId,
      medicationId: props.medicationId ?? null,
      medicationName: props.medicationName.trim(),
      administeredAt: props.administeredAt,
      doseGiven: props.doseGiven ?? null,
      healthThreadId: props.healthThreadId ?? null,
      notes: props.notes ?? null,
      createdAt: new Date(),
    })
  }

  static restore(data: MedicationAdministrationData): MedicationAdministration {
    return new MedicationAdministration(data)
  }

  get id(): string { return this.data.id }
  get patientId(): string { return this.data.patientId }
  get medicationId(): string | null { return this.data.medicationId }
  get medicationName(): string { return this.data.medicationName }
  get administeredAt(): Date { return this.data.administeredAt }
  get doseGiven(): string | null { return this.data.doseGiven }
  get healthThreadId(): string | null { return this.data.healthThreadId }
  get notes(): string | null { return this.data.notes }
  get createdAt(): Date { return this.data.createdAt }

  toJSON(): MedicationAdministrationData { return { ...this.data } }
}
