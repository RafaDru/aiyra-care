import { google } from 'googleapis'
import type { calendar_v3 } from 'googleapis'
import { CalendarConnection } from '../../domain/calendar-connection/calendar-connection.entity.js'
import type { CalendarConnectionRepository } from '../../domain/calendar-connection/calendar-connection.repository.js'
import type { ScheduledEventRepository } from '../../domain/scheduled-event/scheduled-event.repository.js'
import type { ScheduledEventService, IcsImportResult } from '../scheduled-event/scheduled-event.service.js'
import { encrypt, decrypt } from '../../infrastructure/crypto-helper.js'
import { ScheduledEvent } from '../../domain/scheduled-event/scheduled-event.entity.js'

const CALENDAR_SCOPE = 'https://www.googleapis.com/auth/calendar.events https://www.googleapis.com/auth/userinfo.profile'

export interface GoogleCalendarSyncResult {
  pull: IcsImportResult
  pushed: number
  pushFailed: number
}

function apiPublicBase(): string {
  return process.env.API_PUBLIC_URL?.trim() || 'http://127.0.0.1:3010'
}

function webPublicBase(): string {
  return process.env.WEB_PUBLIC_URL?.trim() || 'http://localhost:5173'
}

function oauthClientId(): string | undefined {
  return process.env.GOOGLE_CALENDAR_CLIENT_ID?.trim()
    || process.env.GOOGLE_OAUTH_CLIENT_ID?.trim()
    || undefined
}

function oauthClientSecret(): string | undefined {
  return process.env.GOOGLE_CALENDAR_CLIENT_SECRET?.trim()
    || process.env.GOOGLE_OAUTH_CLIENT_SECRET?.trim()
    || undefined
}

function redirectUri(): string {
  return process.env.GOOGLE_CALENDAR_REDIRECT_URI?.trim()
    || `${apiPublicBase()}/calendar/google/oauth/callback`
}

export function isGoogleCalendarConfigured(): boolean {
  return Boolean(oauthClientId() && oauthClientSecret())
}

export class GoogleCalendarService {
  constructor(
    private readonly connections: CalendarConnectionRepository,
    private readonly scheduledEvents: ScheduledEventService,
    private readonly scheduledRepo: ScheduledEventRepository,
  ) {}

  buildOAuthState(accountId: string, patientId: string, returnTo?: string): string {
    return encrypt(JSON.stringify({
      accountId,
      patientId,
      returnTo: returnTo?.trim() || `/patients/${patientId}?tab=agenda`,
      v: 1,
    }))
  }

  parseOAuthState(state: string): { accountId: string; patientId: string; returnTo: string } {
    const parsed = JSON.parse(decrypt(state)) as {
      accountId?: string
      patientId?: string
      returnTo?: string
      v?: number
    }
    if (!parsed.accountId || !parsed.patientId) throw new Error('State OAuth inválido')
    const returnTo = parsed.returnTo?.startsWith('/') ? parsed.returnTo : `/patients/${parsed.patientId}?tab=agenda`
    return { accountId: parsed.accountId, patientId: parsed.patientId, returnTo }
  }

  buildAuthUrl(accountId: string, patientId: string, returnTo?: string): string {
    const clientId = oauthClientId()
    const clientSecret = oauthClientSecret()
    if (!clientId || !clientSecret) {
      throw new Error('Google Calendar OAuth não configurado')
    }
    const oauth2 = new google.auth.OAuth2(clientId, clientSecret, redirectUri())
    return oauth2.generateAuthUrl({
      access_type: 'offline',
      prompt: 'consent',
      scope: [CALENDAR_SCOPE],
      state: this.buildOAuthState(accountId, patientId, returnTo),
    })
  }

  async handleOAuthCallback(code: string, state: string): Promise<{ connection: CalendarConnection; returnTo: string }> {
    const { accountId, patientId, returnTo } = this.parseOAuthState(state)
    const clientId = oauthClientId()
    const clientSecret = oauthClientSecret()
    if (!clientId || !clientSecret) throw new Error('Google Calendar OAuth não configurado')

    const oauth2 = new google.auth.OAuth2(clientId, clientSecret, redirectUri())
    const { tokens } = await oauth2.getToken(code)
    if (!tokens.access_token) throw new Error('Google não retornou access_token')

    const expiresAt = tokens.expiry_date ? new Date(tokens.expiry_date) : null
    const connection = CalendarConnection.restore({
      id: crypto.randomUUID(),
      accountId,
      patientId,
      provider: 'google',
      calendarId: 'primary',
      calendarLabel: 'Google Calendar (principal)',
      encryptedAccessToken: encrypt(tokens.access_token),
      encryptedRefreshToken: tokens.refresh_token ? encrypt(tokens.refresh_token) : null,
      tokenExpiresAt: expiresAt,
      lastSyncAt: null,
      active: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    })
    const saved = await this.connections.upsert(connection)

    // Tenta obter foto de perfil da conta Google para aplicar no paciente
    try {
      const oauth2User = new google.auth.OAuth2(clientId, clientSecret, redirectUri())
      oauth2User.setCredentials({ access_token: tokens.access_token })
      const oauth2Api = google.oauth2({ version: 'v2', auth: oauth2User })
      const userInfo = await oauth2Api.userinfo.get()
      if (userInfo.data.picture) {
        const { PatientPgRepository } = await import('../../infrastructure/persistence/patient.pg.repository.js')
        const { PatientService } = await import('../patient/patient.service.js')
        const patientService = new PatientService(new PatientPgRepository((this.connections as any).pool))
        await patientService.update(patientId, { photoUrl: userInfo.data.picture })
      }
    } catch {
      // foto opcional — não falha o callback OAuth
    }

    return { connection: saved, returnTo }
  }

  async getStatus(accountId: string, patientId: string) {
    const conn = await this.connections.findByAccountPatient(accountId, patientId)
    if (!conn) return { connected: false, configured: isGoogleCalendarConfigured() }
    return { ...conn.toJSON(), configured: true }
  }

  async disconnect(accountId: string, patientId: string) {
    await this.connections.deleteByAccountPatient(accountId, patientId)
  }

  private async getAuthorizedClient(connection: CalendarConnection) {
    const clientId = oauthClientId()
    const clientSecret = oauthClientSecret()
    if (!clientId || !clientSecret) throw new Error('Google Calendar OAuth não configurado')

    const oauth2 = new google.auth.OAuth2(clientId, clientSecret, redirectUri())
    oauth2.setCredentials({
      access_token: decrypt(connection.encryptedAccessToken),
      refresh_token: connection.encryptedRefreshToken
        ? decrypt(connection.encryptedRefreshToken)
        : undefined,
      expiry_date: connection.tokenExpiresAt?.getTime(),
    })

    oauth2.on('tokens', async (tokens) => {
      if (!tokens.access_token) return
      const updated = connection.withTokens({
        encryptedAccessToken: encrypt(tokens.access_token),
        encryptedRefreshToken: tokens.refresh_token
          ? encrypt(tokens.refresh_token)
          : connection.encryptedRefreshToken,
        tokenExpiresAt: tokens.expiry_date ? new Date(tokens.expiry_date) : connection.tokenExpiresAt,
      })
      await this.connections.update(updated)
    })

    return google.calendar({ version: 'v3', auth: oauth2 })
  }

  private parseGoogleDateTime(
    dt?: calendar_v3.Schema$EventDateTime,
  ): Date | null {
    if (!dt) return null
    if (dt.dateTime) return new Date(dt.dateTime)
    if (dt.date) return new Date(`${dt.date}T12:00:00`)
    return null
  }

  async sync(accountId: string, patientId: string): Promise<GoogleCalendarSyncResult> {
    const connection = await this.connections.findByAccountPatient(accountId, patientId)
    if (!connection) throw new Error('Google Calendar não conectado')

    const calendar = await this.getAuthorizedClient(connection)
    const now = new Date()
    const timeMin = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
    const timeMax = new Date(now.getTime() + 180 * 24 * 60 * 60 * 1000)

    const listRes = await calendar.events.list({
      calendarId: connection.calendarId,
      timeMin: timeMin.toISOString(),
      timeMax: timeMax.toISOString(),
      singleEvents: true,
      orderBy: 'startTime',
      maxResults: 500,
    })

    const parsed = (listRes.data.items ?? [])
      .map((ev) => {
        const start = this.parseGoogleDateTime(ev.start)
        if (!ev.id || !ev.summary || !start) return null
        return {
          uid: `google:${ev.id}`,
          title: ev.summary,
          description: ev.description ?? null,
          scheduledAt: start,
          endAt: this.parseGoogleDateTime(ev.end),
        }
      })
      .filter((x): x is NonNullable<typeof x> => x !== null)

    const pull = await this.scheduledEvents.importParsedEvents(patientId, parsed, {
      source: 'google',
      sourceLabel: connection.calendarLabel ?? 'Google Calendar',
    })

    let pushed = 0
    let pushFailed = 0
    const localEvents = await this.scheduledRepo.findAll({ patientId })
    const toPush = localEvents.filter(
      (e) => e.status === 'planned'
        && !e.externalUid
        && (e.source === 'local' || e.source === 'ics_import')
        && e.scheduledAt >= now,
    )

    for (const event of toPush) {
      try {
        const res = await calendar.events.insert({
          calendarId: connection.calendarId,
          requestBody: {
            summary: event.title,
            description: event.description ?? undefined,
            start: { dateTime: event.scheduledAt.toISOString() },
            end: {
              dateTime: (event.endAt ?? new Date(event.scheduledAt.getTime() + 3600000)).toISOString(),
            },
          },
        })
        if (!res.data.id) {
          pushFailed += 1
          continue
        }
        const updated = ScheduledEvent.restore({
          ...event.toJSON(),
          externalUid: `google:${res.data.id}`,
          sourceLabel: connection.calendarLabel ?? 'Google Calendar',
          updatedAt: new Date(),
        })
        await this.scheduledRepo.update(updated)
        pushed += 1
      } catch {
        pushFailed += 1
      }
    }

    const synced = connection.markSynced()
    await this.connections.update(synced)

    return { pull, pushed, pushFailed }
  }
}
