import type { AuthorizationItemData } from './authorization-item.entity.js'

export interface AuthorizationHistoryEntry {
  code?: string
  description?: string
  occurredAt?: string
  auditorName?: string
}

export interface AuthorizationLocation {
  formattedAddress?: string
  phone?: string
  city?: string
  state?: string
  latitude?: string
  longitude?: string
}

export interface AuthorizationProps {
  patientId: string
  procedureCode?: string
  procedureDescription?: string
  doctorName?: string
  doctorCouncil?: string
  clinicName?: string
  authorizationDate?: Date
  validityDate?: Date
  status?: string
  guideNumber?: string
  quantity?: number
  notes?: string
  source?: string
  solicitationNumber?: string
  guidePassword?: string
  specialty?: string
  solicitationUrl?: string
  solicId?: string
  solicIdEncrypted?: string
  authorizationType?: string
  classification?: string
  localAddress?: string
  localPhone?: string
  locations?: AuthorizationLocation[]
  history?: AuthorizationHistoryEntry[]
  items?: AuthorizationItemData[]
  medicalRecordId?: string
  providerExternalId?: string
}

export interface AuthorizationData {
  id: string
  patientId: string
  procedureCode: string | null
  procedureDescription: string | null
  doctorName: string | null
  doctorCouncil: string | null
  clinicName: string | null
  authorizationDate: Date | null
  validityDate: Date | null
  status: string
  guideNumber: string | null
  quantity: number | null
  notes: string | null
  source: string
  solicitationNumber: string | null
  guidePassword: string | null
  specialty: string | null
  solicitationUrl: string | null
  solicId: string | null
  solicIdEncrypted: string | null
  authorizationType: string | null
  classification: string | null
  localAddress: string | null
  localPhone: string | null
  locations: AuthorizationLocation[] | null
  history: AuthorizationHistoryEntry[] | null
  items: AuthorizationItemData[]
  medicalRecordId: string | null
  providerExternalId: string | null
  createdAt: Date
  updatedAt: Date
}

export class Authorization {
  private constructor(private readonly data: AuthorizationData) {}

  static create(props: AuthorizationProps, id?: string): Authorization {
    const now = new Date()
    return new Authorization({
      id: id ?? crypto.randomUUID(),
      patientId: props.patientId,
      procedureCode: props.procedureCode ?? null,
      procedureDescription: props.procedureDescription ?? null,
      doctorName: props.doctorName ?? null,
      doctorCouncil: props.doctorCouncil ?? null,
      clinicName: props.clinicName ?? null,
      authorizationDate: props.authorizationDate ?? null,
      validityDate: props.validityDate ?? null,
      status: props.status ?? 'authorized',
      guideNumber: props.guideNumber ?? null,
      quantity: props.quantity ?? null,
      notes: props.notes ?? null,
      source: props.source ?? 'manual',
      solicitationNumber: props.solicitationNumber ?? null,
      guidePassword: props.guidePassword ?? null,
      specialty: props.specialty ?? null,
      solicitationUrl: props.solicitationUrl ?? null,
      solicId: props.solicId ?? null,
      solicIdEncrypted: props.solicIdEncrypted ?? null,
      authorizationType: props.authorizationType ?? null,
      classification: props.classification ?? null,
      localAddress: props.localAddress ?? null,
      localPhone: props.localPhone ?? null,
      locations: props.locations ?? null,
      history: props.history ?? null,
      items: props.items ?? [],
      medicalRecordId: props.medicalRecordId ?? null,
      providerExternalId: props.providerExternalId ?? null,
      createdAt: now,
      updatedAt: now,
    })
  }

  static restore(data: AuthorizationData): Authorization { return new Authorization(data) }

  withItems(items: AuthorizationItemData[]): Authorization {
    return Authorization.restore({ ...this.data, items })
  }

  get id(): string { return this.data.id }
  get patientId(): string { return this.data.patientId }
  get procedureCode(): string | null { return this.data.procedureCode }
  get procedureDescription(): string | null { return this.data.procedureDescription }
  get doctorName(): string | null { return this.data.doctorName }
  get doctorCouncil(): string | null { return this.data.doctorCouncil }
  get clinicName(): string | null { return this.data.clinicName }
  get authorizationDate(): Date | null { return this.data.authorizationDate }
  get validityDate(): Date | null { return this.data.validityDate }
  get status(): string { return this.data.status }
  get guideNumber(): string | null { return this.data.guideNumber }
  get quantity(): number | null { return this.data.quantity }
  get notes(): string | null { return this.data.notes }
  get source(): string { return this.data.source }
  get solicitationNumber(): string | null { return this.data.solicitationNumber }
  get guidePassword(): string | null { return this.data.guidePassword }
  get specialty(): string | null { return this.data.specialty }
  get solicitationUrl(): string | null { return this.data.solicitationUrl }
  get solicId(): string | null { return this.data.solicId }
  get solicIdEncrypted(): string | null { return this.data.solicIdEncrypted }
  get authorizationType(): string | null { return this.data.authorizationType }
  get classification(): string | null { return this.data.classification }
  get localAddress(): string | null { return this.data.localAddress }
  get localPhone(): string | null { return this.data.localPhone }
  get locations(): AuthorizationLocation[] | null { return this.data.locations }
  get history(): AuthorizationHistoryEntry[] | null { return this.data.history }
  get items(): AuthorizationItemData[] { return this.data.items }
  get medicalRecordId(): string | null { return this.data.medicalRecordId }
  get providerExternalId(): string | null { return this.data.providerExternalId }
  get createdAt(): Date { return this.data.createdAt }
  get updatedAt(): Date { return this.data.updatedAt }

  toJSON(): AuthorizationData { return { ...this.data, items: [...this.data.items] } }
}
