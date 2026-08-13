export type CalendarProvider = 'google' | 'microsoft'

export interface CalendarConnectionData {
  id: string
  accountId: string
  patientId: string
  provider: CalendarProvider
  calendarId: string
  calendarLabel: string | null
  encryptedAccessToken: string
  encryptedRefreshToken: string | null
  tokenExpiresAt: Date | null
  lastSyncAt: Date | null
  active: boolean
  createdAt: Date
  updatedAt: Date
}

export class CalendarConnection {
  private constructor(private readonly data: CalendarConnectionData) {}

  static restore(data: CalendarConnectionData): CalendarConnection {
    return new CalendarConnection(data)
  }

  get id(): string { return this.data.id }
  get accountId(): string { return this.data.accountId }
  get patientId(): string { return this.data.patientId }
  get provider(): CalendarProvider { return this.data.provider }
  get calendarId(): string { return this.data.calendarId }
  get calendarLabel(): string | null { return this.data.calendarLabel }
  get encryptedAccessToken(): string { return this.data.encryptedAccessToken }
  get encryptedRefreshToken(): string | null { return this.data.encryptedRefreshToken }
  get tokenExpiresAt(): Date | null { return this.data.tokenExpiresAt }
  get lastSyncAt(): Date | null { return this.data.lastSyncAt }
  get active(): boolean { return this.data.active }

  toJSON(): Omit<CalendarConnectionData, 'encryptedAccessToken' | 'encryptedRefreshToken'> & {
    connected: boolean
  } {
    return {
      id: this.data.id,
      accountId: this.data.accountId,
      patientId: this.data.patientId,
      provider: this.data.provider,
      calendarId: this.data.calendarId,
      calendarLabel: this.data.calendarLabel,
      tokenExpiresAt: this.data.tokenExpiresAt,
      lastSyncAt: this.data.lastSyncAt,
      active: this.data.active,
      createdAt: this.data.createdAt,
      updatedAt: this.data.updatedAt,
      connected: true,
    }
  }

  withTokens(args: {
    encryptedAccessToken: string
    encryptedRefreshToken?: string | null
    tokenExpiresAt?: Date | null
  }): CalendarConnection {
    return CalendarConnection.restore({
      ...this.data,
      encryptedAccessToken: args.encryptedAccessToken,
      encryptedRefreshToken: args.encryptedRefreshToken ?? this.data.encryptedRefreshToken,
      tokenExpiresAt: args.tokenExpiresAt ?? this.data.tokenExpiresAt,
      updatedAt: new Date(),
    })
  }

  markSynced(): CalendarConnection {
    return CalendarConnection.restore({
      ...this.data,
      lastSyncAt: new Date(),
      updatedAt: new Date(),
    })
  }
}
