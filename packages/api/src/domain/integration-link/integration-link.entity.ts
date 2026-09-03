export interface IntegrationLinkProps {
  patientId: string
  portalType: string
  email?: string
  encryptedPassword?: string
  encryptedSessionToken?: string
  sessionExpiresAt?: Date
  cardNumber?: string
  active?: boolean
  lastSyncAt?: Date
  authAttention?: 'none' | 'credentials' | 'session'
}

export interface IntegrationLinkData {
  id: string
  patientId: string
  portalType: string
  email: string | null
  encryptedPassword: string | null
  encryptedSessionToken: string | null
  sessionExpiresAt: Date | null
  cardNumber: string | null
  active: boolean
  lastSyncAt: Date | null
  authAttention: 'none' | 'credentials' | 'session'
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
      encryptedSessionToken: props.encryptedSessionToken ?? null,
      sessionExpiresAt: props.sessionExpiresAt ?? null,
      cardNumber: props.cardNumber ?? null,
      active: props.active ?? true,
      lastSyncAt: props.lastSyncAt ?? null,
      authAttention: props.authAttention ?? 'none',
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
  get encryptedSessionToken(): string | null { return this.data.encryptedSessionToken }
  get sessionExpiresAt(): Date | null { return this.data.sessionExpiresAt }
  get cardNumber(): string | null { return this.data.cardNumber }
  get active(): boolean { return this.data.active }
  get lastSyncAt(): Date | null { return this.data.lastSyncAt }
  get authAttention(): IntegrationLinkData['authAttention'] { return this.data.authAttention }
  get createdAt(): Date { return this.data.createdAt }
  get updatedAt(): Date { return this.data.updatedAt }

  markSynced(): void { this.data.lastSyncAt = new Date(); this.data.updatedAt = new Date() }

  setCardNumber(cardNumber: string): void {
    this.data.cardNumber = cardNumber
    this.data.updatedAt = new Date()
  }

  setSessionToken(encryptedSessionToken: string, sessionExpiresAt: Date): void {
    this.data.encryptedSessionToken = encryptedSessionToken
    this.data.sessionExpiresAt = sessionExpiresAt
    this.data.updatedAt = new Date()
  }

  clearSessionToken(): void {
    this.data.encryptedSessionToken = null
    this.data.sessionExpiresAt = null
    this.data.updatedAt = new Date()
  }

  setAuthAttention(attention: IntegrationLinkData['authAttention']): void {
    this.data.authAttention = attention
    this.data.updatedAt = new Date()
  }

  clearAuthAttention(): void {
    this.data.authAttention = 'none'
    this.data.updatedAt = new Date()
  }

  toJSON(): IntegrationLinkData { return { ...this.data } }
}
