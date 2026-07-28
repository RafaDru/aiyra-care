export interface MedicalRecordProps {
  patientId: string
  recordDate: Date
  recordType: string
  description?: string
  doctorName?: string
  doctorCrm?: string
  specialty?: string
  clinicName?: string
  notes?: string
  source?: string
  invoiceNumber?: string
  chargedAmount?: number
  copartCompanyAmount?: number
  copartBaseAmount?: number
  providerExternalId?: string
  procedureExternalId?: string
}

export interface MedicalRecordData {
  id: string
  patientId: string
  recordDate: Date
  recordType: string
  description: string | null
  doctorName: string | null
  doctorCrm: string | null
  specialty: string | null
  clinicName: string | null
  notes: string | null
  source: string
  invoiceNumber: string | null
  chargedAmount: number | null
  copartCompanyAmount: number | null
  copartBaseAmount: number | null
  providerExternalId: string | null
  procedureExternalId: string | null
  createdAt: Date
}

export class MedicalRecord {
  private constructor(private readonly data: MedicalRecordData) {}

  static create(props: MedicalRecordProps, id?: string): MedicalRecord {
    return new MedicalRecord({
      id: id ?? crypto.randomUUID(),
      patientId: props.patientId,
      recordDate: props.recordDate,
      recordType: props.recordType,
      description: props.description ?? null,
      doctorName: props.doctorName ?? null,
      doctorCrm: props.doctorCrm ?? null,
      specialty: props.specialty ?? null,
      clinicName: props.clinicName ?? null,
      notes: props.notes ?? null,
      source: props.source ?? 'manual',
      invoiceNumber: props.invoiceNumber ?? null,
      chargedAmount: props.chargedAmount ?? null,
      copartCompanyAmount: props.copartCompanyAmount ?? null,
      copartBaseAmount: props.copartBaseAmount ?? null,
      providerExternalId: props.providerExternalId ?? null,
      procedureExternalId: props.procedureExternalId ?? null,
      createdAt: new Date(),
    })
  }

  static restore(data: MedicalRecordData): MedicalRecord { return new MedicalRecord(data) }

  get id(): string { return this.data.id }
  get patientId(): string { return this.data.patientId }
  get recordDate(): Date { return this.data.recordDate }
  get recordType(): string { return this.data.recordType }
  get description(): string | null { return this.data.description }
  get doctorName(): string | null { return this.data.doctorName }
  get doctorCrm(): string | null { return this.data.doctorCrm }
  get specialty(): string | null { return this.data.specialty }
  get clinicName(): string | null { return this.data.clinicName }
  get notes(): string | null { return this.data.notes }
  get source(): string { return this.data.source }
  get invoiceNumber(): string | null { return this.data.invoiceNumber }
  get chargedAmount(): number | null { return this.data.chargedAmount }
  get copartCompanyAmount(): number | null { return this.data.copartCompanyAmount }
  get copartBaseAmount(): number | null { return this.data.copartBaseAmount }
  get providerExternalId(): string | null { return this.data.providerExternalId }
  get procedureExternalId(): string | null { return this.data.procedureExternalId }
  get createdAt(): Date { return this.data.createdAt }

  toJSON(): MedicalRecordData { return { ...this.data } }
}
