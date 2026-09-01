import type { APIRequestContext } from 'playwright'
import { HERMES_PARDINI_PRECISION_CARE } from './hermes-pardini.portal.js'

const KC = HERMES_PARDINI_PRECISION_CARE.keycloak

export interface HermesPardiniSession {
  origin: string
  accessToken: string
  refreshToken: string
  login: string
  subject?: string | null
  name?: string | null
  sessionExpiresAt: Date
  /** Headers capturados do GET /pedidos no browser (replay HTTP). */
  pacienteApiHeaders?: Record<string, string>
}

export function formatHermesPardiniUsername(raw: string): string {
  const trimmed = raw.trim()
  const digits = trimmed.replace(/\D/g, '')
  if (digits.length === 11) return digits
  return trimmed
}

function decodeJwtPayload(token: string): Record<string, unknown> {
  try {
    return JSON.parse(
      Buffer.from(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString('utf8'),
    ) as Record<string, unknown>
  } catch {
    return {}
  }
}

export function sessionExpiresAtFromToken(accessToken: string): Date {
  const payload = decodeJwtPayload(accessToken)
  if (typeof payload.exp === 'number') return new Date(payload.exp * 1000)
  return new Date(Date.now() + 55 * 60 * 1000)
}

export function isHermesPardiniSessionValid(session: HermesPardiniSession, skewMs = 60_000): boolean {
  const exp = session.sessionExpiresAt instanceof Date
    ? session.sessionExpiresAt
    : new Date(session.sessionExpiresAt)
  return exp.getTime() > Date.now() + skewMs
}

export function parseHermesPardiniSessionJson(json: string): HermesPardiniSession {
  const raw = JSON.parse(json) as HermesPardiniSession
  return {
    ...raw,
    sessionExpiresAt: raw.sessionExpiresAt instanceof Date
      ? raw.sessionExpiresAt
      : new Date(raw.sessionExpiresAt),
  }
}

export function buildHermesPardiniSession(
  login: string,
  accessToken: string,
  refreshToken: string,
  profile?: { name?: string | null; subject?: string | null },
): HermesPardiniSession {
  const jwt = decodeJwtPayload(accessToken)
  return {
    origin: HERMES_PARDINI_PRECISION_CARE.portalOrigin,
    accessToken,
    refreshToken,
    login,
    subject: profile?.subject ?? (typeof jwt.sub === 'string' ? jwt.sub : null),
    name: profile?.name ?? (typeof jwt.name === 'string' ? jwt.name : null),
    sessionExpiresAt: sessionExpiresAtFromToken(accessToken),
  }
}

function authHeaders(accessToken: string): Record<string, string> {
  return {
    Authorization: `Bearer ${accessToken}`,
    Accept: 'application/json',
  }
}

interface TokenResponse {
  access_token?: string
  refresh_token?: string
  expires_in?: number
  error?: string
  error_description?: string
}

async function parseTokenError(res: { status: () => number; text: () => Promise<string> }): Promise<string> {
  const body = await res.text().catch(() => '')
  try {
    const json = JSON.parse(body) as TokenResponse
    if (json.error_description) return json.error_description
    if (json.error) return json.error
  } catch { /* ignore */ }
  return body.slice(0, 200) || `HTTP ${res.status()}`
}

/** Keycloak / OAuth — sessão expirada, refresh revogado ou credenciais rejeitadas. */
export function isHermesPardiniOAuthSessionRejected(detail: string): boolean {
  return /invalid[_\s-]?grant|token is not active|invalid user credentials/i.test(detail)
}

export function hermesPardiniSessionRejectedUserMessage(): string {
  return 'Hermes Pardini: sessão expirada — clique em Sincronizar e complete o login no portal (senha do protocolo ou código SMS/e-mail/WhatsApp)'
}

export async function loginHermesPardiniApi(
  request: APIRequestContext,
  login: string,
  password: string,
): Promise<{ accessToken: string; refreshToken: string }> {
  const username = formatHermesPardiniUsername(login)
  if (!username) throw new Error('CPF ou código de acesso Hermes Pardini vazio')
  if (!password) throw new Error('Senha Hermes Pardini vazia')

  const res = await request.post(KC.tokenUrl, {
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    form: {
      grant_type: 'password',
      client_id: KC.clientId,
      username,
      password,
      scope: 'openid offline_access',
    },
  })

  if (!res.ok()) {
    const detail = await parseTokenError(res)
    if (res.status() === 401 || isHermesPardiniOAuthSessionRejected(detail)) {
      throw new Error('CPF/código ou senha do protocolo Hermes Pardini incorretos')
    }
    throw new Error(`Login Hermes Pardini falhou (${res.status()}): ${detail}`)
  }

  const json = await res.json() as TokenResponse
  const accessToken = json.access_token
  if (!accessToken) throw new Error('Login Hermes Pardini sem access_token')
  return {
    accessToken,
    refreshToken: json.refresh_token ?? '',
  }
}

export async function refreshHermesPardiniApi(
  request: APIRequestContext,
  refreshToken: string,
): Promise<{ accessToken: string; refreshToken: string } | null> {
  if (!refreshToken) return null
  const res = await request.post(KC.tokenUrl, {
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    form: {
      grant_type: 'refresh_token',
      client_id: KC.clientId,
      refresh_token: refreshToken,
    },
  })
  if (!res.ok()) return null
  const json = await res.json() as TokenResponse
  if (!json.access_token) return null
  return {
    accessToken: json.access_token,
    refreshToken: json.refresh_token ?? refreshToken,
  }
}

export async function fetchHermesPardiniUserInfo(
  request: APIRequestContext,
  accessToken: string,
): Promise<{ name?: string | null; subject?: string | null }> {
  const res = await request.get(KC.userInfoUrl, { headers: authHeaders(accessToken) })
  if (!res.ok()) return {}
  const json = await res.json() as Record<string, unknown>
  return {
    name: json.name != null ? String(json.name) : json.preferred_username != null ? String(json.preferred_username) : null,
    subject: json.sub != null ? String(json.sub) : null,
  }
}

export async function renewHermesPardiniSessionIfNeeded(
  request: APIRequestContext,
  session: HermesPardiniSession,
): Promise<HermesPardiniSession> {
  if (isHermesPardiniSessionValid(session)) return session
  const refreshed = await refreshHermesPardiniApi(request, session.refreshToken)
  if (!refreshed) return session
  const profile = await fetchHermesPardiniUserInfo(request, refreshed.accessToken)
  return buildHermesPardiniSession(session.login, refreshed.accessToken, refreshed.refreshToken, profile)
}
