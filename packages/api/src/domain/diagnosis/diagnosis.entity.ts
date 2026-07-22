export interface DiagnosisProps {
  medicalRecordId?: string
  patientId: string
  diagnosisCode?: string
  diagnosisName: string
  description?: string
  isChronic?: boolean
  diagnosedDate?: Date
  status?: string
}

export interface DiagnosisData {
  id: string
  medicalRecordId: string | null
  patientId: string
  diagnosisCode: string | null
  diagnosisName: string
  description: string | null
  isChronic: boolean
  diagnosedDate: Date | null
  status: string | null
  createdAt: Date
}

export class Diagnosis {
  private constructor(private readonly data: DiagnosisData) {}

  static create(props: DiagnosisProps, id?: string): Diagnosis {
    return new Diagnosis({
      id: id ?? crypto.randomUUID(),
      medicalRecordId: props.medicalRecordId ?? null,
      patientId: props.patientId,
      diagnosisCode: props.diagnosisCode ?? null,
      diagnosisName: props.diagnosisName,
      description: props.description ?? null,
      isChronic: props.isChronic ?? false,
      diagnosedDate: props.diagnosedDate ?? null,
      status: props.status ?? null,
      createdAt: new Date(),
    })
  }

  static restore(data: DiagnosisData): Diagnosis { return new Diagnosis(data) }

  get id(): string { return this.data.id }
  get medicalRecordId(): string | null { return this.data.medicalRecordId }
  get patientId(): string { return this.data.patientId }
  get diagnosisCode(): string | null { return this.data.diagnosisCode }
  get diagnosisName(): string { return this.data.diagnosisName }
  get description(): string | null { return this.data.description }
  get isChronic(): boolean { return this.data.isChronic }
  get diagnosedDate(): Date | null { return this.data.diagnosedDate }
  get status(): string | null { return this.data.status }
  get createdAt(): Date { return this.data.createdAt }

  toJSON(): DiagnosisData { return { ...this.data } }
}
