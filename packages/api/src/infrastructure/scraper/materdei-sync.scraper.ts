import { chromium, request as playwrightRequest, type APIRequestContext, type Page } from 'playwright'
import type { ScraperProgress } from '../../domain/scraper/health-portal-scraper.js'
import {
  mapMaterDeiDocumentsResponse,
  mapMaterDeiExamSearchResponse,
  type MaterDeiDocumentItem,
  type MaterDeiExamItem,
} from './materdei-exam.mapper.js'
import { ensureCdpChromeRunning } from './cdp-chrome.helper.js'
import { fillMaterDeiCredentials } from './materdei-login.helper.js'

export const MATER_DEI_ORIGIN = 'https://meu.materdei.com.br'

/** BFF do portal — padrão /proxy/{serviço}/{path-original}. */
export const MATER_DEI_PROXY = {
  auth: `${MATER_DEI_ORIGIN}/proxy/auth`,
  attendances: `${MATER_DEI_ORIGIN}/proxy/attendances`,
  examResults: `${MATER_DEI_ORIGIN}/proxy/exam-results`,
  surgical: `${MATER_DEI_ORIGIN}/proxy/surgical`,
  ambulatorial: `${MATER_DEI_ORIGIN}/proxy/ambulatorial`,
  documents: `${MATER_DEI_ORIGIN}/proxy/documents`,
} as const

export const MATER_DEI_PATHS = {
  signIn: `${MATER_DEI_PROXY.auth}/auth/v2/auth/patients/sign-in`,
  refresh: `${MATER_DEI_PROXY.auth}/auth/v2/auth/patients/refresh`,
  profile: `${MATER_DEI_PROXY.auth}/auth/patient/auth/profile`,
  lastAttendances: `${MATER_DEI_PROXY.attendances}/attendances/api/v1/patients/attendances/last`,
  activeSurgeries: `${MATER_DEI_PROXY.surgical}/surgical/surgical-order/active-search`,
  examSearch: `${MATER_DEI_PROXY.examResults}/result-exam/api/v1/patients/exams/search`,
  ambulatorialOrders: `${MATER_DEI_PROXY.ambulatorial}/ambulatorial/api/v1/orders/ambulatorial`,
} as const

export const MATER_DEI_DOCUMENT_TYPES = [
  'Laudo dos exames',
  'Pedido médico',
  'Exames laboratoriais',
] as const

export interface MaterDeiDependent {
  patientId?: number
  gatewayPatientId?: number
  name?: string
  identifier?: string
  birthDate?: string
}

export interface MaterDeiPatientProfile {
  name?: string
  identifier?: string
  email?: string
  phone?: string
  patientId?: number
  userId?: number
  gatewayUserId?: number
  gatewayPatientId?: number
  active?: boolean
  dependents?: MaterDeiDependent[]
}

export interface MaterDeiSession {
  origin: string
  accessToken: string
  refreshToken: string
  userId: number | null
  patientId: number | null
  gatewayPatientId: number | null
  patient: MaterDeiPatientProfile
  sessionExpiresAt: Date
}

export interface MaterDeiAttendanceItem {
  id?: string | number
  date?: string
  description?: string
  doctorName?: string
  unitName?: string
  type?: string
  raw: Record<string, unknown>
}

export interface MaterDeiSyncResult {
  session: MaterDeiSession
  attendances: MaterDeiAttendanceItem[]
  surgeries: unknown[]
  exams: MaterDeiExamItem[]
  documents: MaterDeiDocumentItem[]
  ambulatorialOrders: unknown[]
  warnings: string[]
}

function stripCpf(value: string): string {
  return value.replace(/\D/g, '')
}

function parseFlutterStorage(raw: string | null): string | null {
  if (!raw) return null
  try {
    const parsed = JSON.parse(raw) as unknown
    if (typeof parsed === 'string') return parsed
  } catch { /* ignore */ }
  return raw.replace(/^"|"$/g, '')
}

function decodeJwtPayload(token: string): {
  id?: number
  patient_id?: number
  role?: string
  exp?: number
} {
  try {
    return JSON.parse(
      Buffer.from(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString('utf8'),
    ) as ReturnType<typeof decodeJwtPayload>
  } catch {
    return {}
  }
}

function sessionExpiresAt(token: string): Date {
  const payload = decodeJwtPayload(token)
  if (typeof payload.exp === 'number') return new Date(payload.exp * 1000)
  return new Date(Date.now() + 55 * 60 * 1000)
}

function isSessionValid(session: MaterDeiSession, skewMs = 60_000): boolean {
  const exp = sessionExpiresAtValue(session.sessionExpiresAt)
  return exp.getTime() > Date.now() + skewMs
}

function sessionExpiresAtValue(value: Date | string): Date {
  if (value instanceof Date) return value
  const parsed = new Date(value)
  if (!isNaN(parsed.getTime())) return parsed
  return new Date(Date.now() + 55 * 60 * 1000)
}

export function parseMaterDeiSessionJson(json: string): MaterDeiSession {
  const raw = JSON.parse(json) as MaterDeiSession
  return {
    ...raw,
    sessionExpiresAt: sessionExpiresAtValue(raw.sessionExpiresAt),
  }
}

function authHeaders(token: string): Record<string, string> {
  return {
    Authorization: `Bearer ${token}`,
    Accept: 'application/json',
    'Content-Type': 'application/json',
  }
}

function numField(raw: Record<string, unknown>, ...keys: string[]): number | undefined {
  for (const k of keys) {
    const v = raw[k]
    if (typeof v === 'number' && Number.isFinite(v)) return v
    if (typeof v === 'string' && v.trim() !== '' && Number.isFinite(Number(v))) return Number(v)
  }
  return undefined
}

function normalizeProfile(raw: Record<string, unknown>): MaterDeiPatientProfile {
  const dependents = Array.isArray(raw.dependents)
    ? raw.dependents.map((d) => {
        const dep = (d && typeof d === 'object') ? d as Record<string, unknown> : {}
        return {
          patientId: numField(dep, 'patientId', 'patient_id', 'id'),
          gatewayPatientId: numField(dep, 'gatewayPatientId', 'gateway_patient_id'),
          name: dep.name != null ? String(dep.name) : undefined,
          identifier: dep.identifier != null ? String(dep.identifier) : undefined,
          birthDate: dep.birthDate != null ? String(dep.birthDate) : undefined,
        }
      })
    : undefined

  return {
    name: raw.name != null ? String(raw.name) : undefined,
    identifier: raw.identifier != null ? String(raw.identifier) : undefined,
    email: raw.email != null ? String(raw.email) : undefined,
    phone: raw.phone != null ? String(raw.phone) : undefined,
    patientId: numField(raw, 'patientId', 'patient_id') ?? 0,
    userId: numField(raw, 'userId', 'user_id'),
    gatewayUserId: numField(raw, 'gatewayUserId', 'gateway_user_id'),
    gatewayPatientId: numField(raw, 'gatewayPatientId', 'gateway_patient_id'),
    active: raw.active !== false,
    dependents,
  }
}

export async function loginMaterDeiApi(
  request: APIRequestContext,
  cpf: string,
  password: string,
): Promise<{ accessToken: string; refreshToken: string; active: boolean }> {
  const res = await request.post(MATER_DEI_PATHS.signIn, {
    headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
    data: {
      identifier: stripCpf(cpf),
      password,
    },
  })
  if (!res.ok()) {
    const body = await res.text().catch(() => '')
    throw new Error(`Login Mater Dei falhou (${res.status()}): ${body.slice(0, 200)}`)
  }
  const json = await res.json() as {
    data?: {
      access_token?: string
      refresh_token?: string
      active?: boolean
      records?: unknown[]
    }
  }
  const accessToken = json.data?.access_token
  if (!accessToken) {
    if (Array.isArray(json.data?.records) && json.data.records.length > 0) {
      throw new Error('Mater Dei pede validação de segurança — conclua no Chrome')
    }
    if (json.data?.active === false) {
      throw new Error('Credenciais Mater Dei inválidas ou conta inativa')
    }
    throw new Error('Login Mater Dei sem access_token na resposta')
  }
  return {
    accessToken,
    refreshToken: json.data?.refresh_token ?? '',
    active: json.data?.active !== false,
  }
}

export async function refreshMaterDeiApi(
  request: APIRequestContext,
  refreshToken: string,
  gatewayPatientId: number | null,
): Promise<{ accessToken: string; refreshToken: string } | null> {
  if (!refreshToken) return null
  const res = await request.post(MATER_DEI_PATHS.refresh, {
    headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
    data: {
      refresh_token: refreshToken,
      gateway_patient_id: gatewayPatientId ?? 0,
    },
  })
  if (!res.ok()) return null
  const json = await res.json() as { data?: { access_token?: string; refresh_token?: string } }
  const accessToken = json.data?.access_token
  if (!accessToken) return null
  return {
    accessToken,
    refreshToken: json.data?.refresh_token ?? refreshToken,
  }
}

export async function fetchMaterDeiProfile(
  request: APIRequestContext,
  accessToken: string,
): Promise<MaterDeiPatientProfile> {
  const res = await request.get(MATER_DEI_PATHS.profile, {
    headers: authHeaders(accessToken),
  })
  if (!res.ok()) return {}
  const json = await res.json() as { data?: { patient?: Record<string, unknown> } }
  const patient = json.data?.patient
  return patient ? normalizeProfile(patient) : {}
}

export async function fetchMaterDeiLastAttendances(
  request: APIRequestContext,
  accessToken: string,
): Promise<MaterDeiAttendanceItem[]> {
  const res = await request.get(MATER_DEI_PATHS.lastAttendances, {
    headers: authHeaders(accessToken),
  })
  if (!res.ok()) return []
  const json = await res.json() as { data?: unknown[] }
  const list = Array.isArray(json.data) ? json.data : []
  return list.map((item) => {
    const rec = (item && typeof item === 'object') ? item as Record<string, unknown> : {}
    return {
      id: rec.id as string | number | undefined,
      date: String(rec.date ?? rec.attendanceDate ?? rec.scheduledDate ?? ''),
      description: String(rec.description ?? rec.specialty ?? rec.procedure ?? rec.type ?? ''),
      doctorName: String(rec.doctorName ?? rec.physicianName ?? rec.professionalName ?? ''),
      unitName: String(rec.unitName ?? rec.hospitalName ?? rec.location ?? ''),
      type: String(rec.type ?? rec.attendanceType ?? ''),
      raw: rec,
    }
  })
}

export async function fetchMaterDeiActiveSurgeries(
  request: APIRequestContext,
  accessToken: string,
): Promise<unknown[]> {
  const res = await request.get(MATER_DEI_PATHS.activeSurgeries, {
    headers: authHeaders(accessToken),
  })
  if (!res.ok()) return []
  const json = await res.json() as { data?: unknown[] }
  return Array.isArray(json.data) ? json.data : []
}

export async function fetchMaterDeiAmbulatorialOrders(
  request: APIRequestContext,
  accessToken: string,
  patientId: number,
): Promise<unknown[]> {
  const res = await request.get(MATER_DEI_PATHS.ambulatorialOrders, {
    headers: authHeaders(accessToken),
    params: { patientId: String(patientId) },
  })
  if (!res.ok()) return []
  const json = await res.json() as { data?: unknown[] }
  return Array.isArray(json.data) ? json.data : []
}

export async function fetchMaterDeiExamSearchPage(
  request: APIRequestContext,
  accessToken: string,
  params: {
    patientId: number
    startDate: string
    endDate: string
    pageNumber: number
    pageSize: number
  },
): Promise<{ items: MaterDeiExamItem[]; ok: boolean; status: number; error?: string }> {
  const res = await request.get(MATER_DEI_PATHS.examSearch, {
    headers: authHeaders(accessToken),
    params: {
      patientId: String(params.patientId),
      startDate: params.startDate,
      endDate: params.endDate,
      pageNumber: String(params.pageNumber),
      pageSize: String(params.pageSize),
    },
  })
  if (!res.ok()) {
    const body = await res.text().catch(() => '')
    return { items: [], ok: false, status: res.status(), error: body.slice(0, 300) }
  }
  const json = await res.json() as { data?: unknown }
  return {
    items: mapMaterDeiExamSearchResponse(json.data),
    ok: true,
    status: res.status(),
  }
}

async function fetchMaterDeiExamSearchPageWithRetry(
  request: APIRequestContext,
  accessToken: string,
  params: Parameters<typeof fetchMaterDeiExamSearchPage>[2],
): Promise<{ items: MaterDeiExamItem[]; ok: boolean; status: number; error?: string }> {
  let last = await fetchMaterDeiExamSearchPage(request, accessToken, params)
  if (last.ok || last.status !== 500) return last
  for (let attempt = 1; attempt <= 3; attempt++) {
    await new Promise((r) => setTimeout(r, 800 * attempt))
    last = await fetchMaterDeiExamSearchPage(request, accessToken, params)
    if (last.ok || last.status !== 500) return last
  }
  return last
}

export async function fetchAllMaterDeiExams(
  request: APIRequestContext,
  accessToken: string,
  patientId: number,
  opts?: { startDate?: string; endDate?: string; pageSize?: number },
): Promise<MaterDeiExamItem[]> {
  const endDate = opts?.endDate ?? new Date().toISOString().slice(0, 10)
  const startDate = opts?.startDate ?? '2015-01-01'
  const pageSize = opts?.pageSize ?? 50
  const all: MaterDeiExamItem[] = []
  let page = 1

  for (;;) {
    const pageResult = await fetchMaterDeiExamSearchPageWithRetry(request, accessToken, {
      patientId,
      startDate,
      endDate,
      pageNumber: page,
      pageSize,
    })
    if (!pageResult.ok) {
      if (pageResult.status === 500 && patientId === 0) {
        break
      }
      if (pageResult.status === 500 && patientId > 0) {
        break
      }
      if (page === 1) {
        throw new Error(`Busca de exames Mater Dei falhou (${pageResult.status}): ${pageResult.error ?? ''}`)
      }
      break
    }
    if (pageResult.items.length === 0) break
    all.push(...pageResult.items)
    if (pageResult.items.length < pageSize) break
    page += 1
    if (page > 40) break
  }

  return all
}

export async function fetchMaterDeiDocuments(
  request: APIRequestContext,
  accessToken: string,
  patientId: number,
  documentType: string,
): Promise<MaterDeiDocumentItem[]> {
  const url = `${MATER_DEI_PROXY.documents}/documents/api/v1/document/patient/${patientId}/type/${encodeURIComponent(documentType)}`
  const res = await request.get(url, { headers: authHeaders(accessToken) })
  if (!res.ok()) return []
  const json = await res.json() as { data?: unknown }
  return mapMaterDeiDocumentsResponse(json.data, documentType)
}

/**
 * IDs para /patients/exams/search.
 * Validado: gatewayPatientId (ex.: 1539788) retorna exames; patientId=0 → HTTP 500.
 */
export function resolveMaterDeiExamPatientIds(session: MaterDeiSession): number[] {
  const ids = new Set<number>()
  const gateway = resolveMaterDeiGatewayPatientId(session)
  if (gateway != null && gateway > 0) ids.add(gateway)

  for (const dep of session.patient.dependents ?? []) {
    const depGateway = dep.gatewayPatientId ?? dep.patientId
    if (depGateway != null && depGateway > 0) ids.add(depGateway)
  }

  if (ids.size === 0) {
    const profilePid = session.patient.patientId
    if (profilePid != null && profilePid > 0) ids.add(profilePid)
  }

  return [...ids]
}

/** ID para documentos / pedidos ambulatoriais (gateway do titular). */
export function resolveMaterDeiGatewayPatientId(session: MaterDeiSession): number | null {
  const g = session.gatewayPatientId ?? session.patient.gatewayPatientId
  if (g != null && g > 0) return g
  const jwtPid = session.patientId
  if (jwtPid != null && jwtPid > 0) return jwtPid
  return null
}

export function buildMaterDeiSession(
  accessToken: string,
  refreshToken: string,
  profile: MaterDeiPatientProfile,
): MaterDeiSession {
  const jwt = decodeJwtPayload(accessToken)
  return {
    origin: MATER_DEI_ORIGIN,
    accessToken,
    refreshToken,
    userId: jwt.id ?? profile.userId ?? null,
    patientId: jwt.patient_id ?? profile.patientId ?? null,
    gatewayPatientId: profile.gatewayPatientId ?? jwt.patient_id ?? null,
    patient: profile,
    sessionExpiresAt: sessionExpiresAt(accessToken),
  }
}

async function renewSessionIfNeeded(
  request: APIRequestContext,
  session: MaterDeiSession,
): Promise<MaterDeiSession> {
  if (isSessionValid(session)) return session
  const refreshed = await refreshMaterDeiApi(request, session.refreshToken, session.gatewayPatientId)
  if (!refreshed) return session
  const profile = await fetchMaterDeiProfile(request, refreshed.accessToken)
  return buildMaterDeiSession(refreshed.accessToken, refreshed.refreshToken, {
    ...session.patient,
    ...profile,
  })
}

/** Lê flutter.ff_token de aba meu.materdei.com.br aberta no Chrome CDP. */
function materDeiCdpEndpoint(): string | undefined {
  const raw = process.env.MATER_DEI_CDP_URL?.trim() ?? process.env.AMIL_CDP_URL?.trim()
  if (raw === '0') return undefined
  return raw || 'http://127.0.0.1:9222'
}

export async function tryReadMaterDeiTokenFromCdp(endpoint?: string): Promise<string | null> {
  const cdp = endpoint ?? materDeiCdpEndpoint()
  if (!cdp) return null
  let browser
  try {
    browser = await chromium.connectOverCDP(cdp, { timeout: 3000 })
  } catch {
    return null
  }
  try {
    for (const context of browser.contexts()) {
      for (const page of context.pages()) {
        if (!page.url().includes('meu.materdei.com.br')) continue
        const token = await page.evaluate(() => {
          const raw = localStorage.getItem('flutter.ff_token')
          if (!raw) return null
          try {
            const parsed = JSON.parse(raw) as unknown
            return typeof parsed === 'string' ? parsed : null
          } catch {
            return raw.replace(/^"|"$/g, '')
          }
        })
        if (token && token.length > 20) return token
      }
    }
    return null
  } finally {
    await browser.close()
  }
}

async function readTokenFromPage(page: Page): Promise<string | null> {
  return page.evaluate(() => {
    const raw = localStorage.getItem('flutter.ff_token')
    if (!raw) return null
    try {
      const parsed = JSON.parse(raw) as unknown
      return typeof parsed === 'string' ? parsed : null
    } catch {
      return raw.replace(/^"|"$/g, '')
    }
  })
}

async function pollMaterDeiTokenFromPage(
  page: Page,
  timeoutMs: number,
  emit?: (step: string, message: string, status: ScraperProgress['status']) => void,
  waitMessage = 'Aguardando confirmação do login no Meu Mater Dei...',
): Promise<string> {
  const deadline = Date.now() + timeoutMs
  let lastProgressEmit = 0
  emit?.('login', waitMessage, 'running')

  while (Date.now() < deadline) {
    const token = await readTokenFromPage(page)
    if (token && token.length > 20) return token

    const now = Date.now()
    if (now - lastProgressEmit > 12_000) {
      const secsLeft = Math.max(0, Math.round((deadline - now) / 1000))
      emit?.('login', `${waitMessage} (${secsLeft}s restantes)`, 'running')
      lastProgressEmit = now
    }
    await page.waitForTimeout(800)
  }
  throw new Error('Login Mater Dei não detectado (flutter.ff_token vazio). Faça login no Chrome e tente novamente.')
}

/** Login interativo via Chrome CDP — abre Chrome real, preenche CPF/senha Flutter. */
export async function loginMaterDeiViaCdp(
  cpf: string,
  password: string,
  emit?: (step: string, message: string, status: ScraperProgress['status']) => void,
): Promise<string | null> {
  const endpoint = materDeiCdpEndpoint()
  if (!endpoint) return null

  emit?.('login', 'Abrindo Chrome para Meu Mater Dei...', 'running')
  try {
    await ensureCdpChromeRunning(endpoint, {
      profileDirName: 'materdei-chrome-cdp',
      startUrl: MATER_DEI_ORIGIN,
    })
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    emit?.('login', msg, 'failed')
    return null
  }

  emit?.('login', 'Conectando ao Chrome local...', 'running')
  let browser
  try {
    browser = await chromium.connectOverCDP(endpoint, { timeout: 10_000 })
  } catch {
    emit?.('login', 'Não foi possível conectar ao Chrome (porta 9222)', 'failed')
    return null
  }

  try {
    const context = browser.contexts()[0]
    if (!context) return null

    let page = context.pages().find((p) => p.url().includes('meu.materdei.com.br'))
    if (!page) {
      page = await context.newPage()
      await page.goto(MATER_DEI_ORIGIN, { waitUntil: 'domcontentloaded', timeout: 60_000 })
    }

    const existing = await readTokenFromPage(page)
    if (existing && existing.length > 20) {
      emit?.('login', 'Sessão Mater Dei encontrada no Chrome', 'success')
      return existing
    }

    emit?.('login', 'Autenticando via API Mater Dei...', 'running')
    const loginReq = await playwrightRequest.newContext({ baseURL: MATER_DEI_ORIGIN })
    let apiError = ''
    try {
      const login = await loginMaterDeiApi(loginReq, cpf, password)
      await page.goto(`${MATER_DEI_ORIGIN}/home`, { waitUntil: 'domcontentloaded', timeout: 45_000 }).catch(() => {})
      await page.evaluate(({ token }) => {
        localStorage.setItem('flutter.ff_token', JSON.stringify(token))
      }, { token: login.accessToken })
      emit?.('login', 'Autenticado no Meu Mater Dei', 'success')
      return login.accessToken
    } catch (err) {
      apiError = err instanceof Error ? err.message : String(err)
    } finally {
      await loginReq.dispose()
    }

    if (!page.url().includes('meu.materdei.com.br')) {
      await page.goto(MATER_DEI_ORIGIN, { waitUntil: 'domcontentloaded', timeout: 60_000 })
    }

    emit?.('login', 'Preenchendo CPF e senha no Chrome...', 'running')
    try {
      await fillMaterDeiCredentials(page, cpf, password)
      emit?.('login', 'Credenciais preenchidas — clique em Entrar no Chrome', 'running')
    } catch (fillErr) {
      const fillMsg = fillErr instanceof Error ? fillErr.message : String(fillErr)
      emit?.('login', `${apiError || fillMsg} — conclua o login manualmente no Chrome`, 'running')
    }

    const token = await pollMaterDeiTokenFromPage(
      page,
      300_000,
      emit,
      'Aguardando login no Meu Mater Dei (Entrar no Chrome)...',
    )
    emit?.('login', 'Autenticado no Meu Mater Dei', 'success')
    return token
  } finally {
    await browser.close()
  }
}

export async function waitForMaterDeiLogin(
  page: Page,
  opts: { cpf?: string; password?: string; timeoutMs?: number },
  emit?: (step: string, message: string, status: ScraperProgress['status']) => void,
): Promise<string> {
  const timeout = opts.timeoutMs ?? 300_000

  if (opts.cpf && opts.password) {
    emit?.('login', 'Autenticando via API Mater Dei...', 'running')
    const loginReq = await playwrightRequest.newContext({ baseURL: MATER_DEI_ORIGIN })
    try {
      const login = await loginMaterDeiApi(loginReq, opts.cpf, opts.password)
      await page.goto(`${MATER_DEI_ORIGIN}/home`, { waitUntil: 'domcontentloaded', timeout: 45_000 }).catch(() => {})
      await page.evaluate(({ token }) => {
        localStorage.setItem('flutter.ff_token', JSON.stringify(token))
      }, { token: login.accessToken })
      emit?.('login', 'Autenticado no Meu Mater Dei', 'success')
      return login.accessToken
    } catch {
      emit?.('login', 'API indisponível — abrindo Meu Mater Dei no browser...', 'running')
      await page.goto(MATER_DEI_ORIGIN, { waitUntil: 'domcontentloaded', timeout: 60_000 })
      await page.waitForTimeout(1500)
      try {
        await fillMaterDeiCredentials(page, opts.cpf, opts.password)
        emit?.('login', 'Credenciais preenchidas — clique em Entrar', 'running')
      } catch {
        emit?.('login', 'Conclua o login na janela do Chrome (CPF + senha)...', 'running')
      }
    } finally {
      await loginReq.dispose()
    }
  } else {
    emit?.('login', 'Conclua o login no Meu Mater Dei (CPF + senha)...', 'running')
    if (!page.url().includes('meu.materdei.com.br')) {
      await page.goto(MATER_DEI_ORIGIN, { waitUntil: 'domcontentloaded', timeout: 60_000 })
    }
  }

  const token = await pollMaterDeiTokenFromPage(
    page,
    timeout,
    emit,
    'Conclua o login na janela do Chrome (CPF + senha)...',
  )
  emit?.('login', 'Autenticado no Meu Mater Dei', 'success')
  return token
}

async function fetchClinicalBundle(
  request: APIRequestContext,
  session: MaterDeiSession,
  emit?: (p: ScraperProgress) => void,
): Promise<Pick<MaterDeiSyncResult, 'attendances' | 'surgeries' | 'exams' | 'documents' | 'ambulatorialOrders' | 'warnings'>> {
  const token = session.accessToken
  const examPatientIds = resolveMaterDeiExamPatientIds(session)
  const gatewayPatientId = resolveMaterDeiGatewayPatientId(session)
  const warnings: string[] = []

  emit?.({ step: 'fetch-extrato', message: 'Buscando atendimentos Mater Dei...', status: 'running' })
  const [attendances, surgeries] = await Promise.all([
    fetchMaterDeiLastAttendances(request, token),
    fetchMaterDeiActiveSurgeries(request, token),
  ])
  emit?.({
    step: 'fetch-extrato',
    message: `${attendances.length} atendimento(s), ${surgeries.length} cirurgia(s) ativa(s)`,
    status: 'success',
  })

  let exams: MaterDeiExamItem[] = []
  if (examPatientIds.length === 0) {
    const msg = 'Perfil Mater Dei sem patientId para exames'
    warnings.push(msg)
    emit?.({ step: 'fetch-exams', message: msg, status: 'failed' })
  } else {
    emit?.({ step: 'fetch-exams', message: 'Buscando resultados de exames...', status: 'running' })
    const seen = new Set<string>()
    let examFetchFailed = false
    for (const pid of examPatientIds) {
      try {
        const batch = await fetchAllMaterDeiExams(request, token, pid)
        for (const exam of batch) {
          const key = `${pid}:${exam.examOrderId}:${exam.examOrderItemId ?? exam.examType}:${exam.examDate.slice(0, 10)}`
          if (seen.has(key)) continue
          seen.add(key)
          exams.push(exam)
        }
      } catch (err) {
        examFetchFailed = true
        const msg = err instanceof Error ? err.message : String(err)
        const label = pid === 0 ? 'sessão' : `patientId ${pid}`
        warnings.push(`Exames (${label}): ${msg}`)
        emit?.({ step: 'fetch-exams', message: `${label}: ${msg}`.slice(0, 200), status: 'failed' })
      }
    }
    if (examFetchFailed) {
      emit?.({
        step: 'fetch-exams',
        message: exams.length > 0
          ? `${exams.length} exame(s) importados, mas houve erro na busca`
          : 'Falha ao buscar exames no Mater Dei',
        status: 'failed',
      })
    } else {
      emit?.({
        step: 'fetch-exams',
        message: `${exams.length} exame(s) encontrado(s)`,
        status: 'success',
      })
    }
  }

  let documents: MaterDeiDocumentItem[] = []
  const docPatientId = gatewayPatientId ?? (examPatientIds.includes(0) ? 0 : examPatientIds[0])
  if (docPatientId == null) {
    warnings.push('Documentos não consultados — patientId ausente')
    emit?.({ step: 'fetch-documents', message: 'Documentos ignorados (sem patientId)', status: 'failed' })
  } else {
    emit?.({ step: 'fetch-documents', message: 'Buscando documentos clínicos...', status: 'running' })
    let docErrors = 0
    for (const docType of MATER_DEI_DOCUMENT_TYPES) {
      try {
        const batch = await fetchMaterDeiDocuments(request, token, docPatientId, docType)
        documents.push(...batch)
      } catch (err) {
        docErrors += 1
        const msg = err instanceof Error ? err.message : String(err)
        warnings.push(`Documentos (${docType}): ${msg}`)
      }
    }
    if (docErrors > 0) {
      emit?.({
        step: 'fetch-documents',
        message: `${documents.length} documento(s), erro em ${docErrors} tipo(s)`,
        status: 'failed',
      })
    } else {
      emit?.({
        step: 'fetch-documents',
        message: `${documents.length} documento(s) listado(s)`,
        status: 'success',
      })
    }
  }

  let ambulatorialOrders: unknown[] = []
  if (gatewayPatientId != null) {
    ambulatorialOrders = await fetchMaterDeiAmbulatorialOrders(request, token, gatewayPatientId)
  }

  return { attendances, surgeries, exams, documents, ambulatorialOrders, warnings }
}

function allowMaterDeiBrowser(): boolean {
  const v = (process.env.MATER_DEI_ALLOW_BROWSER ?? 'true').toLowerCase()
  return v === '1' || v === 'true' || v === 'yes'
}

/** Prefer API sign-in para obter refresh_token (sync silencioso nas próximas vezes). */
async function buildSessionPreferringApiLogin(
  request: APIRequestContext,
  cpf: string,
  password: string,
  fallbackAccessToken: string,
  fallbackProfile?: MaterDeiPatientProfile,
): Promise<MaterDeiSession> {
  try {
    const login = await loginMaterDeiApi(request, cpf, password)
    const profile = await fetchMaterDeiProfile(request, login.accessToken)
    return buildMaterDeiSession(login.accessToken, login.refreshToken, profile)
  } catch {
    const profile = fallbackProfile ?? await fetchMaterDeiProfile(request, fallbackAccessToken)
    return buildMaterDeiSession(fallbackAccessToken, '', profile)
  }
}

async function acquireMaterDeiSession(
  request: APIRequestContext,
  cpf: string,
  password: string,
  emit: (p: ScraperProgress) => void,
  opts?: { sessionJson?: string },
): Promise<MaterDeiSession> {
  if (opts?.sessionJson) {
    const parsed = parseMaterDeiSessionJson(opts.sessionJson)
    let session = await renewSessionIfNeeded(request, parsed)
    if (!isSessionValid(session) && parsed.refreshToken) {
      const refreshed = await refreshMaterDeiApi(request, parsed.refreshToken, parsed.gatewayPatientId)
      if (refreshed) {
        const profile = await fetchMaterDeiProfile(request, refreshed.accessToken)
        session = buildMaterDeiSession(refreshed.accessToken, refreshed.refreshToken, {
          ...parsed.patient,
          ...profile,
        })
      }
    }
    if (isSessionValid(session)) {
      emit({ step: 'login', message: 'Sessão Mater Dei salva (sem browser)...', status: 'success' })
      return session
    }
    emit({ step: 'login', message: 'Sessão expirada — renovando via API...', status: 'running' })
  }

  try {
    const login = await loginMaterDeiApi(request, cpf, password)
    const profile = await fetchMaterDeiProfile(request, login.accessToken)
    emit({
      step: 'login',
      message: profile.name ? `Conectado como ${profile.name}` : 'Autenticado no Meu Mater Dei',
      status: 'success',
    })
    return buildMaterDeiSession(login.accessToken, login.refreshToken, profile)
  } catch (apiErr) {
    const apiMsg = apiErr instanceof Error ? apiErr.message : String(apiErr)
    if (!allowMaterDeiBrowser()) {
      throw new Error(`${apiMsg}. Defina MATER_DEI_ALLOW_BROWSER=1 para login interativo.`)
    }
    emit({ step: 'login', message: apiMsg, status: 'running' })
  }

  const cdpToken = await tryReadMaterDeiTokenFromCdp()
  if (cdpToken) {
    emit({ step: 'login', message: 'Sessão encontrada no Chrome — sincronizando...', status: 'running' })
    return buildSessionPreferringApiLogin(request, cpf, password, cdpToken)
  }

  const cdpLoginToken = await loginMaterDeiViaCdp(
    cpf,
    password,
    (step, message, status) => emit({ step, message, status }),
  )
  if (cdpLoginToken) {
    return buildSessionPreferringApiLogin(request, cpf, password, cdpLoginToken)
  }

  emit({ step: 'login', message: 'Abrindo Chrome dedicado para login Mater Dei...', status: 'running' })
  const { chromium: pw } = await import('playwright')
  const browser = await pw.launch({ headless: false, channel: 'chrome' })
  try {
    const page = await browser.newPage({ viewport: { width: 1280, height: 900 } })
    const token = await waitForMaterDeiLogin(
      page,
      { cpf, password },
      (step, message, status) => emit({ step, message, status }),
    )
    return buildSessionPreferringApiLogin(request, cpf, password, token)
  } finally {
    await browser.close()
  }
}

/**
 * Auth Mater Dei (validado 2026-07-28):
 * - POST /proxy/auth/auth/v2/auth/patients/sign-in  { identifier: CPF, password }
 * - POST /proxy/auth/auth/v2/auth/patients/refresh  { refresh_token, gateway_patient_id }
 * - JWT em localStorage flutter.ff_token
 * - GET  /proxy/auth/auth/patient/auth/profile
 * - GET  /proxy/attendances/attendances/api/v1/patients/attendances/last
 * - GET  /proxy/surgical/surgical/surgical-order/active-search
 * - GET  /proxy/exam-results/result-exam/api/v1/patients/exams/search
 * - GET  /proxy/documents/documents/api/v1/document/patient/{id}/type/{tipo}
 */
export class MaterDeiSyncScraper {
  async scrape(
    cpf: string,
    password: string,
    emit: (p: ScraperProgress) => void,
    opts?: { sessionJson?: string },
  ): Promise<MaterDeiSyncResult> {
    const request = await playwrightRequest.newContext({ baseURL: MATER_DEI_ORIGIN })

    try {
      let session = await acquireMaterDeiSession(request, cpf, password, emit, opts)

      session = await renewSessionIfNeeded(request, session)
      const profile = await fetchMaterDeiProfile(request, session.accessToken)
      session = buildMaterDeiSession(session.accessToken, session.refreshToken, {
        ...session.patient,
        ...profile,
      })

      const clinical = await fetchClinicalBundle(request, session, emit)

      return { session, ...clinical }
    } finally {
      await request.dispose()
    }
  }
}

export { isSessionValid, parseFlutterStorage }
