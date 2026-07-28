export interface IntegrationLinkProps {
  patientId: string
  portalType: string
  email?: string
  encryptedPassword?: string
  cardNumber?: string
  active?: boolean
  lastSyncAt?: Date
}

export interface IntegrationLinkData {
  id: string
  patientId: string
  portalType: string
  email: string | null
  encryptedPassword: string | null
  cardNumber: string | null
  active: boolean
  lastSyncAt: Date | null
  createdAt: Date
  updatedAt: Date
}

export class IntegrationLink {
  private constructor(private readonly data: IntegrationLinkData) {}

  static create(props: IntegrationLinkProps, id?: string): IntegrationLink {
    return new IntegrationLink({
      id: id ?? crypto.randomUUID(),
      patientId: props.patientId,
      portalType: props.portalType,
      email: props.email ?? null,
      encryptedPassword: props.encryptedPassword ?? null,
      cardNumber: props.cardNumber ?? null,
      active: props.active ?? true,
      lastSyncAt: props.lastSyncAt ?? null,
      createdAt: new Date(),
      updatedAt: new Date(),
    })
  }

  static restore(data: IntegrationLinkData): IntegrationLink { return new IntegrationLink(data) }

  get id(): string { return this.data.id }
  get patientId(): string { return this.data.patientId }
  get portalType(): string { return this.data.portalType }
  get email(): string | null { return this.data.email }
  get encryptedPassword(): string | null { return this.data.encryptedPassword }
  get cardNumber(): string | null { return this.data.cardNumber }
  get active(): boolean { return this.data.active }
  get lastSyncAt(): Date | null { return this.data.lastSyncAt }
  get createdAt(): Date { return this.data.createdAt }
  get updatedAt(): Date { return this.data.updatedAt }

  markSynced(): void { this.data.lastSyncAt = new Date(); this.data.updatedAt = new Date() }

  toJSON(): IntegrationLinkData { return { ...this.data } }
}
