import { CalendarConnection } from '../../domain/calendar-connection/calendar-connection.entity.js'
import type { CalendarConnectionRepository } from '../../domain/calendar-connection/calendar-connection.repository.js'
import type { ScheduledEventRepository } from '../../domain/scheduled-event/scheduled-event.repository.js'
import type { ScheduledEventService, IcsImportResult } from '../scheduled-event/scheduled-event.service.js'
import { encrypt, decrypt } from '../../infrastructure/crypto-helper.js'
import { ScheduledEvent } from '../../domain/scheduled-event/scheduled-event.entity.js'

const GRAPH_BASE = 'https://graph.microsoft.com/v1.0'
const AUTH_BASE = 'https://login.microsoftonline.com/common/oauth2/v2.0'
const SCOPES = 'offline_access Calendars.ReadWrite User.Read'

export interface MicrosoftCalendarSyncResult {
  pull: IcsImportResult
  pushed: number
  pushFailed: number
}

function apiPublicBase(): string {
  return process.env.API_PUBLIC_URL?.trim() || 'http://127.0.0.1:3010'
}

function oauthClientId(): string | undefined {
  return process.env.MICROSOFT_CALENDAR_CLIENT_ID?.trim()
    || process.env.AZURE_CLIENT_ID?.trim()
    || process.env.MICROSOFT_OAUTH_CLIENT_ID?.trim()
    || undefined
}

function oauthClientSecret(): string | undefined {
  return process.env.MICROSOFT_CALENDAR_CLIENT_SECRET?.trim()
    || process.env.AZURE_CLIENT_SECRET?.trim()
    || process.env.MICROSOFT_OAUTH_CLIENT_SECRET?.trim()
    || undefined
}

function redirectUri(): string {
  const explicit = process.env.MICROSOFT_CALENDAR_REDIRECT_URI?.trim()
  if (explicit) return explicit
  // Azure Web redirect: HTTPS obrigatório exceto http://localhost (não aceita 127.0.0.1)
  const base = apiPublicBase().replace('127.0.0.1', 'localhost')
  return `${base}/calendar/microsoft/oauth/callback`
}

export function isMicrosoftCalendarConfigured(): boolean {
  return Boolean(oauthClientId() && oauthClientSecret())
}

type GraphEvent = {
  id?: string
  subject?: string
  body?: { content?: string }
  start?: { dateTime?: string; date?: string; timeZone?: string }
  end?: { dateTime?: string; date?: string; timeZone?: string }
}

export class MicrosoftCalendarService {
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
    }
    if (!parsed.accountId || !parsed.patientId) throw new Error('State OAuth inválido')
    const returnTo = parsed.returnTo?.startsWith('/') ? parsed.returnTo : `/patients/${parsed.patientId}?tab=agenda`
    return { accountId: parsed.accountId, patientId: parsed.patientId, returnTo }
  }

  buildAuthUrl(accountId: string, patientId: string, returnTo?: string): string {
    const clientId = oauthClientId()
    if (!clientId || !oauthClientSecret()) {
      throw new Error('Microsoft Calendar OAuth não configurado')
    }
    const params = new URLSearchParams({
      client_id: clientId,
      response_type: 'code',
      redirect_uri: redirectUri(),
      response_mode: 'query',
      scope: SCOPES,
      state: this.buildOAuthState(accountId, patientId, returnTo),
      prompt: 'consent',
    })
    return `${AUTH_BASE}/authorize?${params.toString()}`
  }

  async handleOAuthCallback(code: string, state: string): Promise<{ connection: CalendarConnection; returnTo: string }> {
    const { accountId, patientId, returnTo } = this.parseOAuthState(state)
    const clientId = oauthClientId()
    const clientSecret = oauthClientSecret()
    if (!clientId || !clientSecret) throw new Error('Microsoft Calendar OAuth não configurado')

    const tokenRes = await fetch(`${AUTH_BASE}/token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        code,
        redirect_uri: redirectUri(),
        grant_type: 'authorization_code',
      }),
    })
    const tokenJson = await tokenRes.json() as {
      access_token?: string
      refresh_token?: string
      expires_in?: number
      error?: string
      error_description?: string
    }
    if (!tokenRes.ok || !tokenJson.access_token) {
      throw new Error(tokenJson.error_description || tokenJson.error || 'Token Microsoft inválido')
    }

    const expiresAt = tokenJson.expires_in
      ? new Date(Date.now() + tokenJson.expires_in * 1000)
      : null

    const connection = CalendarConnection.restore({
      id: crypto.randomUUID(),
      accountId,
      patientId,
      provider: 'microsoft',
      calendarId: 'default',
      calendarLabel: 'Outlook Calendar',
      encryptedAccessToken: encrypt(tokenJson.access_token),
      encryptedRefreshToken: tokenJson.refresh_token ? encrypt(tokenJson.refresh_token) : null,
      tokenExpiresAt: expiresAt,
      lastSyncAt: null,
      active: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    })
    const saved = await this.connections.upsert(connection)

    // Tenta obter foto de perfil Microsoft Graph para aplicar no paciente (se disponível)
    try {
      const photoRes = await fetch(`${GRAPH_BASE}/me/photos/48x48/$value`, {
        headers: { Authorization: `Bearer ${tokenJson.access_token}` },
      })
      if (photoRes.ok) {
        const arrayBuf = await photoRes.arrayBuffer()
        const base64 = Buffer.from(arrayBuf).toString('base64')
        const contentType = photoRes.headers.get('content-type') || 'image/jpeg'
        const dataUrl = `data:${contentType};base64,${base64}`
        const { PatientPgRepository } = await import('../../infrastructure/persistence/patient.pg.repository.js')
        const { PatientService } = await import('../patient/patient.service.js')
        const patientService = new PatientService(new PatientPgRepository((this.connections as any).pool))
        await patientService.update(patientId, { photoUrl: dataUrl })
      }
    } catch {
      // foto opcional — não bloqueia callback OAuth
    }

    return { connection: saved, returnTo }
  }

  async getStatus(accountId: string, patientId: string) {
    const conn = await this.connections.findByAccountPatient(accountId, patientId, 'microsoft')
    if (!conn) return { connected: false, configured: isMicrosoftCalendarConfigured() }
    return { ...conn.toJSON(), configured: true }
  }

  async disconnect(accountId: string, patientId: string) {
    await this.connections.deleteByAccountPatient(accountId, patientId, 'microsoft')
  }

  private async refreshAccessToken(connection: CalendarConnection): Promise<string> {
    const clientId = oauthClientId()
    const clientSecret = oauthClientSecret()
    if (!clientId || !clientSecret) throw new Error('Microsoft Calendar OAuth não configurado')

    let accessToken = decrypt(connection.encryptedAccessToken)
    const expires = connection.tokenExpiresAt?.getTime() ?? 0
    if (expires > Date.now() + 60_000) return accessToken

    const refreshToken = connection.encryptedRefreshToken
      ? decrypt(connection.encryptedRefreshToken)
      : null
    if (!refreshToken) return accessToken

    const tokenRes = await fetch(`${AUTH_BASE}/token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        refresh_token: refreshToken,
        grant_type: 'refresh_token',
        redirect_uri: redirectUri(),
      }),
    })
    const tokenJson = await tokenRes.json() as {
      access_token?: string
      refresh_token?: string
      expires_in?: number
      error?: string
    }
    if (!tokenRes.ok || !tokenJson.access_token) {
      throw new Error(tokenJson.error || 'Falha ao renovar token Microsoft')
    }

    accessToken = tokenJson.access_token
    const updated = connection.withTokens({
      encryptedAccessToken: encrypt(accessToken),
      encryptedRefreshToken: tokenJson.refresh_token
        ? encrypt(tokenJson.refresh_token)
        : connection.encryptedRefreshToken,
      tokenExpiresAt: tokenJson.expires_in
        ? new Date(Date.now() + tokenJson.expires_in * 1000)
        : connection.tokenExpiresAt,
    })
    await this.connections.update(updated)
    return accessToken
  }

  private parseGraphDateTime(dt?: GraphEvent['start']): Date | null {
    if (!dt) return null
    if (dt.dateTime) return new Date(dt.dateTime)
    if (dt.date) return new Date(`${dt.date}T12:00:00`)
    return null
  }

  private async graphGet(connection: CalendarConnection, path: string): Promise<unknown> {
    const token = await this.refreshAccessToken(connection)
    const res = await fetch(`${GRAPH_BASE}${path}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
    if (!res.ok) {
      const err = await res.text()
      throw new Error(`Graph API ${res.status}: ${err.slice(0, 200)}`)
    }
    return res.json()
  }

  private async graphPost(connection: CalendarConnection, path: string, body: unknown): Promise<unknown> {
    const token = await this.refreshAccessToken(connection)
    const res = await fetch(`${GRAPH_BASE}${path}`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    })
    if (!res.ok) {
      const err = await res.text()
      throw new Error(`Graph API ${res.status}: ${err.slice(0, 200)}`)
    }
    return res.json()
  }

  async sync(accountId: string, patientId: string): Promise<MicrosoftCalendarSyncResult> {
    const connection = await this.connections.findByAccountPatient(accountId, patientId, 'microsoft')
    if (!connection) throw new Error('Microsoft Calendar não conectado')

    const now = new Date()
    const timeMin = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
    const timeMax = new Date(now.getTime() + 180 * 24 * 60 * 60 * 1000)

    const viewPath = `/me/calendarView?startDateTime=${encodeURIComponent(timeMin.toISOString())}&endDateTime=${encodeURIComponent(timeMax.toISOString())}&$top=500&$orderby=start/dateTime`
    const listJson = await this.graphGet(connection, viewPath) as { value?: GraphEvent[] }

    const parsed = (listJson.value ?? [])
      .map((ev) => {
        const start = this.parseGraphDateTime(ev.start)
        if (!ev.id || !ev.subject?.trim() || !start) return null
        const desc = ev.body?.content?.replace(/<[^>]+>/g, '').trim()
        return {
          uid: `microsoft:${ev.id}`,
          title: ev.subject.trim(),
          description: desc || null,
          scheduledAt: start,
          endAt: this.parseGraphDateTime(ev.end),
        }
      })
      .filter((x): x is NonNullable<typeof x> => x !== null)

    const pull = await this.scheduledEvents.importParsedEvents(patientId, parsed, {
      source: 'microsoft',
      sourceLabel: connection.calendarLabel ?? 'Outlook Calendar',
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
        const end = event.endAt ?? new Date(event.scheduledAt.getTime() + 3600000)
        const created = await this.graphPost(connection, '/me/events', {
          subject: event.title,
          body: event.description
            ? { contentType: 'text', content: event.description }
            : undefined,
          start: { dateTime: event.scheduledAt.toISOString(), timeZone: 'UTC' },
          end: { dateTime: end.toISOString(), timeZone: 'UTC' },
        }) as { id?: string }
        if (!created.id) {
          pushFailed += 1
          continue
        }
        const updated = ScheduledEvent.restore({
          ...event.toJSON(),
          externalUid: `microsoft:${created.id}`,
          source: 'microsoft',
          sourceLabel: connection.calendarLabel ?? 'Outlook Calendar',
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
