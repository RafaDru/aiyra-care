export interface PatientEmergencyContactProps {
  patientId: string
  name: string
  phone: string
  phoneAlt?: string | null
  relationship?: string | null
  notes?: string | null
  sortOrder?: number
}

export interface PatientEmergencyContactData {
  id: string
  patientId: string
  name: string
  phone: string
  phoneAlt: string | null
  relationship: string | null
  notes: string | null
  sortOrder: number
  deletedAt: Date | null
  deletedBy: string | null
  createdAt: Date
  updatedAt: Date
}

export class PatientEmergencyContact {
  private constructor(private readonly data: PatientEmergencyContactData) {}

  static create(props: PatientEmergencyContactProps, id?: string): PatientEmergencyContact {
    const now = new Date()
    return new PatientEmergencyContact({
      id: id ?? crypto.randomUUID(),
      patientId: props.patientId,
      name: props.name.trim(),
      phone: props.phone.trim(),
      phoneAlt: props.phoneAlt?.trim() ?? null,
      relationship: props.relationship?.trim() ?? null,
      notes: props.notes?.trim() ?? null,
      sortOrder: props.sortOrder ?? 0,
      deletedAt: null,
      deletedBy: null,
      createdAt: now,
      updatedAt: now,
    })
  }

  static restore(data: PatientEmergencyContactData): PatientEmergencyContact {
    return new PatientEmergencyContact(data)
  }

  get id(): string { return this.data.id }
  get patientId(): string { return this.data.patientId }
  get name(): string { return this.data.name }
  get phone(): string { return this.data.phone }
  get phoneAlt(): string | null { return this.data.phoneAlt }
  get relationship(): string | null { return this.data.relationship }
  get notes(): string | null { return this.data.notes }
  get sortOrder(): number { return this.data.sortOrder }
  get deletedAt(): Date | null { return this.data.deletedAt }
  get deletedBy(): string | null { return this.data.deletedBy }
  get createdAt(): Date { return this.data.createdAt }
  get updatedAt(): Date { return this.data.updatedAt }

  update(fields: Partial<Pick<PatientEmergencyContactProps, 'name' | 'phone' | 'phoneAlt' | 'relationship' | 'notes' | 'sortOrder'>>) {
    if (fields.name != null) this.data.name = fields.name.trim()
    if (fields.phone != null) this.data.phone = fields.phone.trim()
    if (fields.phoneAlt !== undefined) this.data.phoneAlt = fields.phoneAlt?.trim() ?? null
    if (fields.relationship !== undefined) this.data.relationship = fields.relationship?.trim() ?? null
    if (fields.notes !== undefined) this.data.notes = fields.notes?.trim() ?? null
    if (fields.sortOrder != null) this.data.sortOrder = fields.sortOrder
    this.data.updatedAt = new Date()
  }

  softDelete(deletedBy?: string | null) {
    this.data.deletedAt = new Date()
    this.data.deletedBy = deletedBy ?? null
    this.data.updatedAt = new Date()
  }

  toJSON(): PatientEmergencyContactData { return { ...this.data } }
}
