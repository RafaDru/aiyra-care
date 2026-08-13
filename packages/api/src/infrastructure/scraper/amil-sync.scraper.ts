import { spawn } from 'node:child_process'
import { existsSync, mkdirSync } from 'node:fs'
import { join } from 'node:path'
import { chromium, request as playwrightRequest, type APIRequestContext, type BrowserContext, type Page } from 'playwright'
import type { ScraperProgress } from '../../domain/scraper/health-portal-scraper.js'
import type { PlanAddOn, PlanWaitingPeriod } from '../../domain/insurance-plan/insurance-plan.entity.js'
import type { PortalPlanSnapshot } from '../../application/insurance-plan/insurance-plan.service.js'
import { fetchAmilUtilizacao, type AmilUsageItem } from './amil-utilizacao.helper.js'

const BASE = 'https://www.amil.com.br/beneficiario'
const API = `${BASE}/api/Beneficiario`

export interface AmilAuthorizationItem {
  solicitationNumber: string
  guidePassword: string
  guideNumber: string
  token: string
  authorizationDate: string
  validityDate: string
  status: string
  authorizationType: string
  classification: string
  procedureDescription: string
  doctorName: string
  clinicName: string
}

export interface AmilBeneficiarySnapshot {
  name: string
  marcaOtica: string
  cpf?: string
  cns?: string
  birthDate?: string
  role: 'holder' | 'dependent'
}

export interface AmilBeneficiarySyncData {
  beneficiary: AmilBeneficiarySnapshot
  plan: PortalPlanSnapshot
  authorizations: AmilAuthorizationItem[]
  usageItems: import('./amil-utilizacao.helper.js').AmilUsageItem[]
  cardNumber: string
  marcaOtica: string
}

export interface AmilSyncResult {
  plan: PortalPlanSnapshot
  authorizations: AmilAuthorizationItem[]
  beneficiaryData: AmilBeneficiarySyncData[]
  cardNumber: string | null
  marcaOtica: string
  sessionToken: string
  sessionExpiresAt: Date
}

export interface AmilScrapeOpts {
  patientName?: string
  cardNumber?: string
  /** JWT userToken de sync anterior — evita abrir browser. */
  sessionToken?: string
  /** Primeira sync / botão Sincronizar — permite CDP/browser se API falhar. */
  interactiveLogin?: boolean
  /** Início do período para PostTokens (guias). Default: 12 meses. */
  guidesPeriodStart?: Date
  /** Sync silencioso — pula fetch de plano/carências. */
  incremental?: boolean
}

type Json = Record<string, unknown>

const AMIL_USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36'

function extractTokenFromLoginJson(json: unknown): string {
  const rec = asRecord(json)
  if (!rec) return ''
  return str(rec.token, pickNested(rec, ['data', 'token']), pickNested(rec, ['Data', 'token']))
}

/** Login HTTP AuthOGS — sem browser (prioridade após JWT salvo). */
async function loginAmilViaApi(login: string, password: string): Promise<string | null> {
  const digits = normalizeLogin(login)
  if (!digits || !password) return null

  const request = await playwrightRequest.newContext({
    baseURL: BASE,
    userAgent: AMIL_USER_AGENT,
    extraHTTPHeaders: {
      Accept: 'application/json',
      'Accept-Language': 'pt-BR,pt;q=0.9',
    },
  })

  try {
    await request.get(`${BASE}/#/`, { timeout: 45_000 }).catch(() => {})

    const loginVariants = [digits]
    const masked = formatAmilLoginMask(digits)
    if (masked !== digits) loginVariants.push(masked)

    for (const loginValue of loginVariants) {
      const res = await request.post(`${BASE}/api/AuthOGS/Login`, {
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
          Origin: 'https://www.amil.com.br',
          Referer: `${BASE}/`,
        },
        data: { userData: { login: loginValue, senha: password, idSistema: 400 } },
      })
      if (res.status() === 401) {
        throw new Error('Usuário ou senha Amil inválidos')
      }
      if (!res.ok()) continue
      const token = extractTokenFromLoginJson(await res.json())
      if (token && isAmilSessionValid(token)) return token
    }
    return null
  } finally {
    await request.dispose()
  }
}

function allowBrowserLaunch(): boolean {
  const v = (process.env.AMIL_ALLOW_BROWSER ?? 'false').toLowerCase()
  return v === '1' || v === 'true' || v === 'yes'
}

function cdpProfileDir(): string {
  const dir = join(process.cwd(), '.cache', 'amil-chrome-cdp')
  mkdirSync(dir, { recursive: true })
  return dir
}

function cdpPort(endpoint: string): string {
  try {
    return new URL(endpoint).port || '9222'
  } catch {
    return '9222'
  }
}

async function isCdpReady(endpoint: string): Promise<boolean> {
  try {
    const res = await fetch(`${endpoint.replace(/\/$/, '')}/json/version`, {
      signal: AbortSignal.timeout(2000),
    })
    return res.ok
  } catch {
    return false
  }
}

function resolveChromeExecutable(): string {
  const candidates = [
    process.env.AMIL_CHROME_PATH?.trim(),
    join(process.env.LOCALAPPDATA || '', 'Google', 'Chrome', 'Application', 'chrome.exe'),
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
  ].filter(Boolean) as string[]
  for (const p of candidates) {
    if (existsSync(p)) return p
  }
  throw new Error('Google Chrome não encontrado. Instale o Chrome ou defina AMIL_CHROME_PATH.')
}

async function ensureCdpChromeRunning(endpoint: string): Promise<void> {
  if (await isCdpReady(endpoint)) return

  const chrome = resolveChromeExecutable()
  const port = cdpPort(endpoint)
  spawn(chrome, [
    `--remote-debugging-port=${port}`,
    `--user-data-dir=${cdpProfileDir()}`,
  ], { detached: true, stdio: 'ignore' }).unref()

  const deadline = Date.now() + 25_000
  while (Date.now() < deadline) {
    if (await isCdpReady(endpoint)) return
    await new Promise((r) => setTimeout(r, 500))
  }
  throw new Error('Chrome não respondeu na porta de debug (9222)')
}

function cdpEndpoint(): string | undefined {
  const url = process.env.AMIL_CDP_URL?.trim()
  if (url) return url
  return process.env.AMIL_CDP_URL === '0' ? undefined : 'http://127.0.0.1:9222'
}

function isHeadless(): boolean {
  // Amil WAF costuma bloquear headless; default é navegador visível.
  // Force headless with AMIL_HEADLESS=true.
  const v = (process.env.AMIL_HEADLESS ?? 'false').toLowerCase()
  return v === '1' || v === 'true' || v === 'yes'
}

function amilUserDataDir(): string | undefined {
  const dir = process.env.AMIL_USER_DATA_DIR?.trim()
  if (dir) return dir
  if (!isHeadless()) {
    const profile = join(process.cwd(), '.cache', 'amil-browser')
    mkdirSync(profile, { recursive: true })
    return profile
  }
  return undefined
}

function manualLoginTimeoutMs(): number {
  const raw = Number(process.env.AMIL_MANUAL_LOGIN_TIMEOUT_MS ?? '300000')
  return Number.isFinite(raw) && raw > 0 ? raw : 300000
}

function extractMarcaOticaFromJwt(token: string): string {
  const jwt = decodeJwtPayload(token)
  // Sessão real Amil: carteirinha/marca ótica vem em objeto.login (não marcaOtica).
  return str(
    pickNested(jwt, ['objeto', 'login']),
    pickNested(jwt, ['objeto', 'marcaOtica']),
    jwt?.marcaOtica,
    jwt?.MarcaOtica,
  )
}

function normalizeLogin(raw: string): string {
  return raw.replace(/[^\d]/g, '')
}

/** Espelha a máscara do portal Amil (redux-form normalize Cd). */
function formatAmilLoginMask(raw: string): string {
  const digits = normalizeLogin(raw)
  if (!digits) return ''
  if (digits.length <= 10) return digits
  if (digits.length <= 11) {
    return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9, 11)}`
  }
  return digits.slice(0, 15)
}

/** Preenche inputs controlados pelo React/redux-form (fill() sozinho deixa senha vazia). */
async function setReactInputValue(page: Page, selector: string, value: string): Promise<void> {
  const ok = await page.evaluate(({ selector, value }) => {
    const el = document.querySelector(selector) as HTMLInputElement | null
    if (!el) return false
    el.focus()
    const proto = Object.getPrototypeOf(el) as HTMLInputElement
    const desc = Object.getOwnPropertyDescriptor(proto, 'value')
      || Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')
    desc?.set?.call(el, value)
    el.dispatchEvent(new Event('input', { bubbles: true }))
    el.dispatchEvent(new Event('change', { bubbles: true }))
    el.dispatchEvent(new KeyboardEvent('keyup', { bubbles: true }))
    el.blur()
    return el.value === value || el.value.replace(/\D/g, '') === value.replace(/\D/g, '')
  }, { selector, value })
  if (!ok) throw new Error(`Não foi possível preencher o campo ${selector}`)
}

async function fillAmilCredentials(page: Page, login: string, password: string): Promise<string> {
  const digits = normalizeLogin(login)
  if (!digits) throw new Error('CPF / nº do beneficiário Amil está vazio')
  if (!password) throw new Error('Senha Amil está vazia')

  await page.getByRole('textbox', { name: /CPF|Benefici/i }).first().waitFor({ state: 'visible', timeout: 20000 })
  await page.locator('input[type="password"], #password, input[name="password"]').first()
    .waitFor({ state: 'visible', timeout: 20000 })

  const masked = formatAmilLoginMask(digits)
  // Username: valor mascarado (como a UI mostra). Senha: valor cru.
  await setReactInputValue(page, '#username, input[name="username"]', masked)

  // Tenta selectors comuns de senha
  const pwdSelectors = ['#password', 'input[name="password"]', 'input[type="password"]']
  let pwdSet = false
  for (const sel of pwdSelectors) {
    const count = await page.locator(sel).count()
    if (!count) continue
    try {
      await setReactInputValue(page, sel, password)
      pwdSet = true
      break
    } catch {
      // try next
    }
  }
  if (!pwdSet) {
    const passField = page.getByRole('textbox', { name: /Senha/i }).first()
    await passField.click()
    await passField.pressSequentially(password, { delay: 25 })
    await passField.blur()
  }

  const check = await page.evaluate(() => {
    const user = document.querySelector('#username, input[name="username"]') as HTMLInputElement | null
    const pwd = document.querySelector('#password, input[name="password"], input[type="password"]') as HTMLInputElement | null
    return {
      user: user?.value || '',
      pwdLen: (pwd?.value || '').length,
    }
  })
  if (!normalizeLogin(check.user) || normalizeLogin(check.user) !== digits) {
    throw new Error(`CPF não ficou no formulário Amil (obtido: "${check.user}")`)
  }
  if (!check.pwdLen) {
    throw new Error('Senha não ficou no formulário Amil (campo vazio após preenchimento)')
  }

  return digits
}

/** Login via fetch in-page (mesma origem) — costuma passar o WAF melhor que clique automatizado. */
async function tryInPageLogin(
  page: Page,
  loginDigits: string,
  password: string,
): Promise<{ ok: boolean; status: number; token?: string }> {
  return page.evaluate(async ({ login, senha, base }) => {
    const res = await fetch(`${base}/api/AuthOGS/Login`, {
      method: 'POST',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({
        userData: { login, senha, idSistema: 400 },
      }),
    })
    let token = ''
    if (res.ok) {
      try {
        const data = await res.json() as { token?: string; data?: { token?: string } }
        token = data?.token || data?.data?.token || ''
      } catch { /* ignore */ }
      if (token) {
        document.cookie = `userToken=${encodeURIComponent(token)}; path=/; max-age=10800`
      }
    }
    return { ok: res.ok, status: res.status, token: token || undefined }
  }, { login: loginDigits, senha: password, base: BASE })
}

async function warmAmilLoginPage(page: Page): Promise<void> {
  await page.goto(`${BASE}/#/`, { waitUntil: 'domcontentloaded', timeout: 45000 })
  await page.getByRole('button', { name: /Accept All|Aceitar|Confirm My Choices/i }).first()
    .click({ timeout: 2500 })
    .catch(() => {})
  // Deixa cookies/WAF estabilizarem antes do POST de login.
  await page.waitForTimeout(1500)
}

function normalizeName(name: string | null | undefined): string {
  return (name || '').normalize('NFD').replace(/\p{M}/gu, '').toUpperCase().replace(/\s+/g, ' ').trim()
}

function asRecord(v: unknown): Json | null {
  return v && typeof v === 'object' && !Array.isArray(v) ? (v as Json) : null
}

function asArray(v: unknown): unknown[] {
  return Array.isArray(v) ? v : []
}

function str(...vals: unknown[]): string {
  for (const v of vals) {
    if (typeof v === 'string' && v.trim()) return v.trim()
    if (typeof v === 'number' && Number.isFinite(v)) return String(v)
  }
  return ''
}

function pickNested(obj: Json | null, path: string[]): unknown {
  let cur: unknown = obj
  for (const key of path) {
    const rec = asRecord(cur)
    if (!rec) return undefined
    cur = rec[key]
  }
  return cur
}

function mapAmilStatus(raw: string): string {
  const s = raw.toUpperCase()
  if (s.includes('VALIDADO') || s.includes('AUTORI')) return 'authorized'
  if (s.includes('UTILIZ') || s.includes('USAD')) return 'used'
  if (s.includes('CANCEL') || s.includes('NEGAD')) return 'cancelled'
  if (s.includes('EXPIR') || s.includes('VENC')) return 'expired'
  if (s.includes('ANALISE') || s.includes('PEND')) return 'pending'
  return raw || 'authorized'
}

function decodeJwtPayload(token: string): Json | null {
  try {
    const part = token.split('.')[1]
    if (!part) return null
    const json = Buffer.from(part.replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString('utf8')
    return JSON.parse(json) as Json
  } catch {
    return null
  }
}

function sessionExpiresAt(token: string): Date {
  const payload = decodeJwtPayload(token)
  const exp = payload?.exp
  if (typeof exp === 'number' && Number.isFinite(exp)) {
    return new Date(exp * 1000)
  }
  // Cookie Amil padrão ~30 min sem exp no JWT.
  return new Date(Date.now() + 25 * 60 * 1000)
}

export function isAmilSessionValid(token: string | null | undefined, skewMs = 60_000): boolean {
  if (!token?.trim()) return false
  return sessionExpiresAt(token).getTime() > Date.now() + skewMs
}

function formatDateInput(d: Date): string {
  return d.toISOString().slice(0, 10)
}

function toIsoDate(raw: unknown): string | null {
  const s = str(raw)
  if (!s) return null
  const d = new Date(s)
  return Number.isNaN(d.getTime()) ? null : d.toISOString()
}

function mapWaitingPeriods(raw: unknown): PlanWaitingPeriod[] {
  const root = raw
  const candidates = [
    asArray(root),
    asArray(asRecord(root)?.lista),
    asArray(asRecord(root)?.carencias),
    asArray(asRecord(root)?.listaCarencia),
    asArray(asRecord(root)?.grupos),
    asArray(pickNested(asRecord(root), ['objeto', 'carencias'])),
  ]
  const list = candidates.find((a) => a.length > 0) ?? []
  const out: PlanWaitingPeriod[] = []
  for (const item of list) {
    const rec = asRecord(item)
    if (!rec) continue
    const description = str(
      rec.descricao,
      rec.descricaoGrupo,
      rec.descricaoCarencia,
      rec.nomeGrupo,
      rec.grupo,
      rec.procedimento,
      rec.nome,
    )
    if (!description) continue
    out.push({
      description,
      endsAt: toIsoDate(rec.dataFim ?? rec.dataTermino ?? rec.dataLiberacao ?? rec.fimCarencia ?? rec.dataFimCarencia) ?? undefined,
      group: str(rec.grupo, rec.nomeGrupo, rec.tipo, rec.codigoGrupo) || undefined,
    })
  }
  return out
}

function mapBeneficiaryList(raw: unknown): Json[] {
  const root = asRecord(raw)
  const list = [
    asArray(raw),
    asArray(root?.lista),
    asArray(root?.beneficiarios),
    asArray(root?.objeto),
  ].find((a) => a.length > 0) ?? []
  return list.map(asRecord).filter((x): x is Json => !!x)
}

function beneficiaryName(b: Json): string {
  return str(
    b.nome,
    b.nomeBeneficiario,
    b.nomeSocial,
    pickNested(b, ['beneficiario', 'nome']),
    pickNested(b, ['titular', 'beneficiario', 'nome']),
  )
}

function beneficiaryMarca(b: Json): string {
  return str(b.marcaOtica, b.marcaOptica, b.carteirinha, b.numeroCarteirinha, b.codigoBeneficiario)
}

function selectBeneficiary(
  list: Json[],
  opts?: { patientName?: string; cardNumber?: string },
): Json | null {
  if (!list.length) return null
  const targetCard = (opts?.cardNumber || '').replace(/\s/g, '')
  const targetName = normalizeName(opts?.patientName)

  if (targetCard) {
    const byCard = list.find((b) => beneficiaryMarca(b).replace(/\s/g, '') === targetCard
      || str(b.carteirinha, b.numeroCarteirinha).replace(/\s/g, '') === targetCard)
    if (byCard) return byCard
  }
  if (targetName) {
    const byName = list.find((b) => normalizeName(beneficiaryName(b)).includes(targetName)
      || targetName.includes(normalizeName(beneficiaryName(b))))
    if (byName) return byName
  }
  return list.find((b) => /titular/i.test(str(b.tipoAssociacao, b.tipo, b.papel))) ?? list[0]
}

function mapBeneficiarySnapshot(b: Json): AmilBeneficiarySnapshot {
  const roleRaw = str(b.tipoAssociacao, b.tipo, b.papel)
  const role: AmilBeneficiarySnapshot['role'] = /titular/i.test(roleRaw) ? 'holder' : 'dependent'
  const birthRaw = str(b.dataNascimento, b.dataNasc)
  return {
    name: beneficiaryName(b),
    marcaOtica: beneficiaryMarca(b),
    cpf: str(b.cpf) || undefined,
    cns: str(b.cns) || undefined,
    birthDate: birthRaw ? birthRaw.slice(0, 10) : undefined,
    role,
  }
}

function isTitularBeneficiary(b: Json): boolean {
  return /titular/i.test(str(b.tipoAssociacao, b.tipo, b.papel))
}

function buildPlanSnapshot(
  beneficiary: Json,
  carteirinhaRec: Json | null,
  planoRaw: unknown,
  carenciaRaw: unknown,
  sharedExternalKey?: string,
): { plan: PortalPlanSnapshot; cardNumber: string } {
  const waitingPeriods = mapWaitingPeriods(carenciaRaw)
  let planFields = planFromBeneficiary(beneficiary, waitingPeriods)
  planFields = enrichFromPlanoEndpoint(planoRaw, planFields)
  if (carteirinhaRec) {
    planFields = enrichFromAmilFlat(
      beneficiary,
      carteirinhaRec,
      asRecord(asArray(planoRaw)[0] ?? planoRaw),
      planFields,
    )
  }

  const marcaOtica = beneficiaryMarca(beneficiary)
  const cardNumber = str(
    carteirinhaRec && beneficiaryMarca(carteirinhaRec),
    beneficiary.carteirinha,
    beneficiary.numeroCarteirinha,
    beneficiary.codigoBeneficiario,
    marcaOtica,
  ) || marcaOtica

  const cardValidTo = toIsoDate(carteirinhaRec?.dataFimPlano ?? carteirinhaRec?.dataValidade)
  const cardValidFrom = toIsoDate(carteirinhaRec?.dataInclusao ?? beneficiary.dataInclusao)
  const externalKey = sharedExternalKey || planFields.productCode || marcaOtica

  const plan: PortalPlanSnapshot = {
    operator: 'amil',
    operatorName: 'Amil',
    planName: planFields.planName || 'Plano Amil',
    productCode: planFields.productCode,
    networkName: planFields.networkName,
    networkCode: planFields.networkCode,
    segmentation: planFields.segmentation,
    accommodation: planFields.accommodation,
    geographicCoverage: planFields.geographicCoverage,
    regulationType: planFields.regulationType,
    contractType: planFields.contractType,
    contractorName: planFields.contractorName,
    addOns: planFields.addOns,
    waitingPeriods,
    externalKey,
    source: 'amil',
    raw: { ...planFields.raw, carteirinha: carteirinhaRec ?? null },
    memberNumber: cardNumber,
    role: planFields.role,
    status: planFields.status,
    cns: planFields.cns,
    inclusionDate: planFields.inclusionDate,
    cardValidFrom: cardValidFrom ? new Date(cardValidFrom) : null,
    cardValidTo: cardValidTo ? new Date(cardValidTo) : null,
  }

  return { plan, cardNumber }
}

function planFromBeneficiary(b: Json, waitingPeriods: PlanWaitingPeriod[]): {
  planName: string
  productCode?: string
  networkName?: string
  networkCode?: string
  segmentation?: string
  accommodation?: string
  geographicCoverage?: string
  regulationType?: string
  contractType?: string
  contractorName?: string
  addOns?: PlanAddOn[]
  cns?: string
  role?: string
  status?: string
  inclusionDate?: Date | null
  raw: Json
} {
  const plano = asRecord(b.plano)
    ?? asRecord(pickNested(b, ['titular', 'plano']))
    ?? asRecord(b)
  const registro = asRecord(plano?.registroANS) ?? asRecord(plano?.registroAns)
  const rede = asRecord(plano?.rede)

  const planName = str(
    registro?.nome,
    plano?.nomePlano,
    plano?.nome,
    b.nomePlano,
    'Plano Amil',
  )
  const productCode = str(registro?.codigo, registro?.numero, plano?.matriculaANS, plano?.codigoAns, plano?.registroANS) || undefined
  const roleRaw = str(b.tipoAssociacao, b.tipo, b.papel)
  const role = /depend/i.test(roleRaw) ? 'dependent' : 'holder'
  const statusRaw = str(b.status, b.situacao, plano?.status)
  const status = /inativ|cancel|exclu/i.test(statusRaw) ? 'inactive' : 'active'

  return {
    planName,
    productCode,
    networkName: str(rede?.nome, plano?.nomeRede, b.nomeRedePlano, b.nomeRedeAtendimento) || undefined,
    networkCode: str(b.codigoRedePlano) || undefined,
    segmentation: str(plano?.segmentacao, b.segmentacaoPlano, b.segmentacao) || undefined,
    accommodation: str(plano?.acomodacao, plano?.tipoAcomodacao, b.acomodacaoPlano) || undefined,
    geographicCoverage: str(plano?.abrangencia, plano?.tipoAbrangencia, b.abrangenciaPlano) || undefined,
    regulationType: str(b.tipoRegulamentacaoPlano) || undefined,
    contractType: str(plano?.tipoContratacao, b.tipoContratacao, b.codTipoplano) || undefined,
    contractorName: str(plano?.contratante, plano?.nomeContratante, b.contratante) || undefined,
    addOns: mapAmilAddOns(b.aditivos),
    cns: str(b.cns, b.numeroCartaoNacionalSaude, pickNested(b, ['beneficiario', 'cns'])) || undefined,
    role,
    status,
    inclusionDate: toIsoDate(b.dataInclusao ?? plano?.dataInclusao) ? new Date(toIsoDate(b.dataInclusao ?? plano?.dataInclusao)!) : null,
    raw: { beneficiary: b, waitingPeriods },
  }
}

function mapAmilAddOns(raw: unknown): PlanAddOn[] {
  const list = asArray(raw)
  const out: PlanAddOn[] = []
  for (const item of list) {
    const rec = asRecord(item)
    if (!rec) continue
    const description = str(rec.descricao, rec.description)
    if (!description) continue
    out.push({
      code: str(rec.codigo) || undefined,
      description,
      includedAt: toIsoDate(rec.dataInclusao) ?? undefined,
    })
  }
  return out
}

/** Amil expõe campos flat (*Plano, *Field) — não só registroANS aninhado. */
function enrichFromAmilFlat(
  beneficiary: Json,
  carteirinha: Json | null,
  planoEndpoint: Json | null,
  base: ReturnType<typeof planFromBeneficiary>,
): ReturnType<typeof planFromBeneficiary> {
  const card = carteirinha ?? beneficiary
  const ep = planoEndpoint ?? {}

  const planName = str(
    ep.nomeField,
    ep.registroANSNome,
    card.nomePlanoCartao,
    card.nomePlano,
    beneficiary.nomePlano,
    beneficiary.nomeAnsPlano,
    base.planName,
  )
  const productCode = str(
    ep.registroANSCodigo,
    card.codigoAnsPlano,
    beneficiary.codigoAnsPlano,
    card.codigoPlano,
    beneficiary.codigoPlano,
    base.productCode,
  ) || base.productCode

  return {
    ...base,
    planName: planName || base.planName,
    productCode: productCode || base.productCode,
    networkName: str(ep.redeField, card.nomeRedePlano, beneficiary.nomeRedePlano, base.networkName) || base.networkName,
    networkCode: str(card.codigoRedePlano, beneficiary.codigoRedePlano, ep.codigoRedePlano) || undefined,
    segmentation: str(ep.segmentacaoField, card.segmentacaoPlano, beneficiary.segmentacaoPlano, base.segmentation) || base.segmentation,
    accommodation: str(ep.acomodacaoField, card.acomodacaoPlano, beneficiary.acomodacaoPlano, base.accommodation) || base.accommodation,
    geographicCoverage: str(ep.abrangenciaField, card.abrangenciaPlano, beneficiary.abrangenciaPlano, base.geographicCoverage) || base.geographicCoverage,
    regulationType: str(ep.tipoRegulamentacaoField, card.tipoRegulamentacaoPlano, beneficiary.tipoRegulamentacaoPlano) || undefined,
    contractType: str(ep.tipoContratacaoField, card.tipoContratacao, beneficiary.tipoContratacao, base.contractType) || base.contractType,
    contractorName: str(
      ep.contratanteField,
      card.contratante,
      card.nomeFantasia,
      ep.nomeFantasiaField,
      beneficiary.contratante,
      base.contractorName,
    ) || base.contractorName,
    addOns: (() => {
      const addons = mapAmilAddOns(ep.listAditivoField ?? card.aditivos ?? beneficiary.aditivos)
      return addons.length ? addons : base.addOns
    })(),
    cns: str(ep.cartaoNacionalSaude, card.cns, beneficiary.cns, base.cns) || base.cns,
    raw: {
      ...base.raw,
      carteirinha: carteirinha ?? base.raw.carteirinha ?? null,
      planoEndpoint: planoEndpoint ?? base.raw.planoEndpoint ?? null,
      linhaPlano: str(card.linhaPlano, beneficiary.linhaPlano, ep.linha),
      contratoNumero: str(card.contratoNumero, ep.contratoNumeroField),
      administradora: str(card.administradora, ep.administradoraField),
      operadora: str(ep.operadoraField),
      tipoCartao: asRecord(card.tipoCartao)?.nome,
    },
  }
}

function enrichFromPlanoEndpoint(planoRaw: unknown, base: ReturnType<typeof planFromBeneficiary>) {
  const list = asArray(planoRaw).length ? asArray(planoRaw) : [planoRaw]
  const first = asRecord(list[0])
  if (!first) return base
  const registro = asRecord(first.registroANS) ?? asRecord(first.registroAns)
  const rede = asRecord(first.rede)
  const merged = {
    ...base,
    planName: str(first.nomeField, registro?.nome, first.nomePlano, first.nome, base.planName),
    productCode: str(first.registroANSCodigo, registro?.codigo, first.codigoAns, base.productCode) || base.productCode,
    networkName: str(first.redeField, rede?.nome, first.nomeRede, base.networkName) || base.networkName,
    segmentation: str(first.segmentacaoField, first.segmentacao, base.segmentation) || base.segmentation,
    accommodation: str(first.acomodacaoField, first.acomodacao, first.tipoAcomodacao, base.accommodation) || base.accommodation,
    geographicCoverage: str(first.abrangenciaField, first.abrangencia, base.geographicCoverage) || base.geographicCoverage,
    contractType: str(first.tipoContratacaoField, first.tipoContratacao, base.contractType) || base.contractType,
    contractorName: str(first.contratanteField, first.contratante, first.nomeContratante, first.nomeFantasiaField, base.contractorName) || base.contractorName,
    regulationType: str(first.tipoRegulamentacaoField, base.regulationType) || base.regulationType,
    addOns: mapAmilAddOns(first.listAditivoField).length
      ? mapAmilAddOns(first.listAditivoField)
      : base.addOns,
    raw: { ...base.raw, planoEndpoint: first },
  }
  return enrichFromAmilFlat(base.raw.beneficiary as Json ?? {}, asRecord(base.raw.carteirinha), first, merged)
}

export class AmilSyncScraper {
  async scrape(
    login: string,
    password: string,
    onProgress?: (p: ScraperProgress) => void,
    opts?: AmilScrapeOpts,
  ): Promise<AmilSyncResult> {
    const emit = (step: string, message: string, status: ScraperProgress['status']) => onProgress?.({ step, message, status })
    const interactiveLogin = opts?.interactiveLogin ?? false

    if (opts?.sessionToken && isAmilSessionValid(opts.sessionToken)) {
      emit('login', 'Sessão Amil salva...', 'running')
      try {
        return await this.authenticatedSync(opts.sessionToken, 'Sessão Amil reutilizada', emit, opts)
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err)
        if (!/401|403|sess[aã]o|token|unauthorized/i.test(msg)) throw err
        emit('login', 'Sessão salva expirada, renovando...', 'running')
      }
    }

    try {
      emit('login', 'Autenticando na Amil (API)...', 'running')
      const apiToken = await loginAmilViaApi(login, password)
      if (apiToken) {
        return await this.authenticatedSync(apiToken, 'Autenticado via API Amil', emit, opts)
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      if (/inv[aá]lid|senha|401/i.test(msg)) throw err
      emit('login', 'API indisponível, tentando outras formas...', 'running')
    }

    if (!interactiveLogin) {
      const cdpToken = await this.tryReadTokenFromCdp(emit)
      if (cdpToken) {
        return await this.authenticatedSync(cdpToken, 'Sessão lida do Chrome (CDP)', emit, opts)
      }
      throw new Error(
        'Sessão Amil indisponível. Use Sincronizar para conectar (primeira vez ou após expirar a sessão).',
      )
    }

    const endpoint = cdpEndpoint()
    if (endpoint) {
      try {
        const token = await this.loginViaCdpChrome(login, password, endpoint, emit)
        return this.authenticatedSync(token, 'Autenticado na Amil', emit, opts)
      } catch (cdpErr) {
        if (!allowBrowserLaunch()) throw cdpErr
        emit('login', 'Tentando navegador automatizado...', 'running')
      }
    } else if (!allowBrowserLaunch()) {
      throw new Error('Sessão Amil indisponível e CDP desabilitado (AMIL_CDP_URL=0).')
    }

    const token = await this.acquireTokenViaBrowser(login, password, emit)
    return this.authenticatedSync(token, 'Autenticado na Amil', emit, opts)
  }

  /** Lê userToken válido do Chrome CDP sem sync completo (renovação silenciosa). */
  async tryRefreshTokenFromCdp(): Promise<{ token: string; expiresAt: Date } | null> {
    const token = await this.tryReadTokenFromCdp()
    if (!token) return null
    return { token, expiresAt: sessionExpiresAt(token) }
  }

  private async authenticatedSync(
    token: string,
    loginSuccessMessage: string,
    emit: (step: string, message: string, status: ScraperProgress['status']) => void,
    opts?: AmilScrapeOpts,
  ): Promise<AmilSyncResult> {
    emit('login', loginSuccessMessage, 'success')
    return this.syncWithToken(token, emit, opts)
  }

  private async syncWithToken(
    token: string,
    emit: (step: string, message: string, status: ScraperProgress['status']) => void,
    opts?: AmilScrapeOpts,
  ): Promise<AmilSyncResult> {
    const request = await playwrightRequest.newContext({
      extraHTTPHeaders: this.authHeaders(token),
    })
    try {
      return await this.fetchAllData(request, token, emit, opts)
    } finally {
      await request.dispose()
    }
  }

  private async fetchAllData(
    request: APIRequestContext,
    token: string,
    emit: (step: string, message: string, status: ScraperProgress['status']) => void,
    opts?: AmilScrapeOpts,
  ): Promise<AmilSyncResult> {
    const jwtMarca = extractMarcaOticaFromJwt(token)

    emit('fetch-beneficiarios', 'Buscando beneficiários e plano...', 'running')
    const logado = await this.getJson(request, token, `${API}/Beneficiario/Logado`).catch(() => null)
    const holderMarca = str(
      jwtMarca,
      asRecord(logado)?.marcaOtica,
      asRecord(logado)?.login,
      pickNested(asRecord(logado), ['objeto', 'login']),
      pickNested(asRecord(logado), ['objeto', 'marcaOtica']),
      opts?.cardNumber,
    )
    if (!holderMarca) throw new Error('Não foi possível identificar a marca ótica / carteirinha Amil')

    const listRaw = await this.getJson(request, token, `${API}/Beneficiario/${holderMarca}/ListaBeneficiarios`)
    let beneficiaries = mapBeneficiaryList(listRaw)
    if (!beneficiaries.length) {
      beneficiaries = [{ marcaOtica: holderMarca }]
    }
    beneficiaries = [...beneficiaries].sort((a, b) => {
      const score = (x: Json) => (isTitularBeneficiary(x) ? 0 : 1)
      return score(a) - score(b)
    })

    const skipPlanFetch = opts?.incremental ?? false
    let carteirinhaList: Json[] = []
    if (!skipPlanFetch) {
      emit('fetch-plano', 'Buscando carteirinhas do plano...', 'running')
      const carteirinhaRaw = await this.getJson(
        request,
        token,
        `${API}/Beneficiario/${holderMarca}/ListaBeneficiariosCarteirinha`,
      ).catch(() => null)
      carteirinhaList = mapBeneficiaryList(carteirinhaRaw)
    } else {
      emit('fetch-plano', 'Sync incremental — guias apenas...', 'running')
    }

    const beneficiaryData: AmilBeneficiarySyncData[] = []
    let sharedExternalKey: string | undefined

    for (const b of beneficiaries) {
      const marcaOtica = beneficiaryMarca(b) || holderMarca
      const snapshot = mapBeneficiarySnapshot(b)
      const label = snapshot.name.split(' ')[0] || 'beneficiário'

      let plan: PortalPlanSnapshot
      let cardNumber: string

      if (skipPlanFetch) {
        plan = {
          operator: 'amil',
          operatorName: 'Amil',
          planName: 'Plano Amil',
          source: 'amil',
          externalKey: sharedExternalKey ?? marcaOtica,
        }
        cardNumber = marcaOtica
      } else {
        emit('fetch-plano', `Plano — ${label}...`, 'running')
        const [planoRaw, carenciaRaw] = await Promise.all([
          this.getJson(request, token, `${API}/Beneficiario/${marcaOtica}/Plano`).catch(() => null),
          this.getJson(request, token, `${API}/Carencia/${marcaOtica}`).catch(() => null),
        ])

        const carteirinhaMatch = carteirinhaList.find((c) => beneficiaryMarca(c) === marcaOtica) ?? b
        const carteirinhaRec = asRecord(carteirinhaMatch)
        const built = buildPlanSnapshot(b, carteirinhaRec, planoRaw, carenciaRaw, sharedExternalKey)
        plan = built.plan
        cardNumber = built.cardNumber
        if (!sharedExternalKey && plan.productCode) {
          sharedExternalKey = plan.productCode
        } else if (sharedExternalKey) {
          plan.externalKey = sharedExternalKey
        }
      }

      emit('fetch-autorizacoes', `Guias — ${label}...`, 'running')
      const authorizations = await this.fetchAuthorizations(request, token, marcaOtica, emit, {
        silent: true,
        periodStart: opts?.guidesPeriodStart,
      })

      emit('fetch-utilizacao', `Utilização — ${label}...`, 'running')
      const usageItems = await fetchAmilUtilizacao(request, token, marcaOtica, API)

      beneficiaryData.push({
        beneficiary: snapshot,
        plan,
        authorizations,
        usageItems,
        cardNumber,
        marcaOtica,
      })
    }

    const holderEntry = beneficiaryData.find((d) => d.beneficiary.role === 'holder')
      ?? beneficiaryData.find((d) => d.marcaOtica === holderMarca)
      ?? beneficiaryData[0]

    if (!holderEntry) {
      throw new Error('Nenhum beneficiário encontrado no plano Amil')
    }

    const totalAuths = beneficiaryData.reduce((n, d) => n + d.authorizations.length, 0)
    emit('fetch-autorizacoes', `${totalAuths} guias/tokens obtidos (${beneficiaryData.length} beneficiários)`, 'running')

    return {
      plan: holderEntry.plan,
      authorizations: holderEntry.authorizations,
      beneficiaryData,
      cardNumber: holderEntry.cardNumber,
      marcaOtica: holderEntry.marcaOtica,
      sessionToken: token,
      sessionExpiresAt: sessionExpiresAt(token),
    }
  }

  /** Lê userToken do Chrome real via CDP (sem abrir janela Playwright). */
  private async tryReadTokenFromCdp(
    emit?: (step: string, message: string, status: ScraperProgress['status']) => void,
  ): Promise<string | null> {
    const endpoint = cdpEndpoint()
    if (!endpoint) return null

    emit?.('login', 'Procurando sessão no Chrome local...', 'running')
    let browser
    try {
      browser = await chromium.connectOverCDP(endpoint, { timeout: 3000 })
    } catch {
      return null
    }

    try {
      for (const context of browser.contexts()) {
        const cookies = await context.cookies('https://www.amil.com.br')
        const raw = cookies.find((c) => c.name === 'userToken')?.value
        if (raw) {
          const token = decodeURIComponent(raw)
          if (isAmilSessionValid(token)) return token
        }

        for (const page of context.pages()) {
          if (!page.url().includes('amil.com.br')) continue
          const fromPage = await this.readUserToken(page, context)
          if (fromPage && isAmilSessionValid(fromPage)) return fromPage
        }
      }
      return null
    } finally {
      await browser.close()
    }
  }

  /** Abre Chrome real (não Playwright), preenche credenciais e aguarda clique manual em Entrar. */
  private async openAmilCdpPage(context: BrowserContext): Promise<Page> {
    const deadline = Date.now() + 10_000
    while (Date.now() < deadline) {
      const onAmil = context.pages().find((p) => p.url().includes('amil.com.br'))
      if (onAmil) return onAmil
      await new Promise((r) => setTimeout(r, 250))
    }

    const reusable = context.pages().find((p) => !p.url().startsWith('devtools://'))
    const page = reusable ?? await context.newPage()
    if (!page.url().includes('amil.com.br')) {
      await page.goto(`${BASE}/#/`, { waitUntil: 'domcontentloaded', timeout: 45_000 })
    }
    return page
  }

  private async loginViaCdpChrome(
    login: string,
    password: string,
    endpoint: string,
    emit: (step: string, message: string, status: ScraperProgress['status']) => void,
  ): Promise<string> {
    emit('login', 'Abrindo Chrome para login Amil...', 'running')
    await ensureCdpChromeRunning(endpoint)

    const browser = await chromium.connectOverCDP(endpoint, { timeout: 10_000 })
    try {
      const context = browser.contexts()[0]
      if (!context) throw new Error('Chrome CDP sem contexto ativo')

      const page = await this.openAmilCdpPage(context)

      const existing = await this.readUserToken(page, context)
      if (existing && isAmilSessionValid(existing)) {
        emit('login', 'Sessão Amil encontrada no Chrome', 'running')
        return existing
      }

      await page.getByRole('button', { name: /Accept All|Aceitar|Confirm My Choices/i }).first()
        .click({ timeout: 2500 })
        .catch(() => {})

      emit('login', 'Preenchendo credenciais no Chrome...', 'running')
      const loginDigits = await fillAmilCredentials(page, login, password)

      emit('login', 'Autenticando...', 'running')
      const inPage = await tryInPageLogin(page, loginDigits, password)
      if (inPage.token) {
        emit('login', 'Autenticado na Amil', 'running')
        return inPage.token
      }
      if (inPage.status === 401) {
        throw new Error('Usuário ou senha Amil inválidos')
      }

      await page.getByRole('button', { name: /^Entrar$/i }).first().click({ timeout: 5000 }).catch(() => {})

      emit('login', 'Clique em Entrar no Chrome (login manual)...', 'running')
      const token = await this.waitForUserToken(page, context, emit, manualLoginTimeoutMs())
      if (!token) {
        const hint = await this.readLoginAlerts(page)
        throw new Error(hint || 'Login não concluído — clique em Entrar no Chrome aberto pelo sync')
      }
      emit('login', 'Autenticado na Amil', 'running')
      return token
    } finally {
      await browser.close()
    }
  }

  private async acquireTokenViaBrowser(
    login: string,
    password: string,
    emit: (step: string, message: string, status: ScraperProgress['status']) => void,
  ): Promise<string> {
    const profileDir = amilUserDataDir()
    const contextOpts = {
      headless: isHeadless(),
      channel: 'chrome' as const,
      slowMo: isHeadless() ? 0 : 40,
      args: ['--disable-blink-features=AutomationControlled'],
      locale: 'pt-BR',
      timezoneId: 'America/Sao_Paulo',
      userAgent:
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
    }

    const context = profileDir
      ? await chromium.launchPersistentContext(profileDir, contextOpts)
      : await (async () => {
        const browser = await chromium.launch(contextOpts)
        return browser.newContext({
          locale: contextOpts.locale,
          timezoneId: contextOpts.timezoneId,
          userAgent: contextOpts.userAgent,
        })
      })()

    await context.addInitScript(() => {
      Object.defineProperty(Navigator.prototype, 'webdriver', { get: () => false })
    })

    try {
      emit('login', 'Abrindo portal Amil...', 'running')
      return await this.loginInContext(context, login, password, emit)
    } finally {
      await context.close()
    }
  }

  private async loginInContext(
    context: BrowserContext,
    login: string,
    password: string,
    emit?: (step: string, message: string, status: ScraperProgress['status']) => void,
  ): Promise<string> {
    const page = context.pages()[0] ?? await context.newPage()

    await warmAmilLoginPage(page)

    const existingToken = await this.readUserToken(page, context)
    if (existingToken && isAmilSessionValid(existingToken)) {
      emit?.('login', 'Sessão Amil reutilizada', 'running')
      return existingToken
    }

    emit?.('login', 'Preenchendo credenciais...', 'running')
    const loginDigits = await fillAmilCredentials(page, login, password)

    emit?.('login', 'Autenticando...', 'running')
    const inPage = await tryInPageLogin(page, loginDigits, password)
    if (inPage.token) {
      emit?.('login', 'Login aceito', 'running')
      return inPage.token
    }

    if (inPage.status === 401) {
      throw new Error('Usuário ou senha Amil inválidos')
    }

    if (!isHeadless()) {
      emit?.('login', 'Clique em Entrar na janela do Chrome (login manual)...', 'running')
      const manualToken = await this.waitForUserToken(page, context, emit, manualLoginTimeoutMs())
      if (manualToken) {
        emit?.('login', 'Autenticado na Amil', 'running')
        return manualToken
      }
      const hint = await this.readLoginAlerts(page)
      throw new Error(
        hint || 'Login Amil não concluído — clique em Entrar na janela do Chrome dentro do tempo limite',
      )
    }

    const loginWait = page.waitForResponse(
      (r) => /AuthOGS\/Login|(^|\/)Login$/i.test(r.url()) && r.request().method() === 'POST',
      { timeout: 30000 },
    ).catch(() => null)

    await page.getByRole('button', { name: /^Entrar$/i }).click()

    const loginRes = await loginWait
    if (loginRes) {
      if (loginRes.status() === 403) {
        throw new Error('Amil bloqueou o login automatizado (403/WAF). Use Chrome com CDP ou login manual.')
      }
      if (loginRes.status() === 401) {
        throw new Error('Usuário ou senha Amil inválidos')
      }
      if (!loginRes.ok()) {
        let detail = ''
        try {
          const body = await loginRes.json() as { message?: string; errorMessage?: string; title?: string }
          detail = str(body.message, body.errorMessage, body.title)
        } catch {
          detail = (await loginRes.text().catch(() => '')).slice(0, 160)
        }
        throw new Error(`Falha no login Amil (${loginRes.status()}): ${detail || 'erro desconhecido'}`)
      }
    }

    const token = await this.waitForUserToken(page, context, emit)
    if (!token) {
      const hint = await this.readLoginAlerts(page)
      throw new Error(hint || 'Login Amil não estabeleceu sessão (cookie userToken)')
    }

    emit?.('login', 'Autenticado na Amil', 'running')
    return token
  }

  private async readUserToken(page: Page, context: BrowserContext): Promise<string | null> {
    const cookies = await context.cookies()
    const fromCookie = cookies.find((c) => c.name === 'userToken')?.value
    if (fromCookie) return decodeURIComponent(fromCookie)

    const fromDom = await page.evaluate(() => {
      const m = document.cookie.match(/userToken=([^;]+)/)
      return m ? decodeURIComponent(m[1]) : ''
    }).catch(() => '')
    return fromDom || null
  }

  private async readLoginAlerts(page: Page): Promise<string> {
    const alertText = await page.locator('[role="alert"], .alert, .error, .custom-alert, .toast, .notification').allTextContents()
      .catch(() => [] as string[])
    return alertText
      .map((t) => t.trim())
      .filter((t) => t && !/^carregamento conclu/i.test(t))
      .join(' | ')
  }

  private async waitForUserToken(
    page: Page,
    context: BrowserContext,
    emit?: (step: string, message: string, status: ScraperProgress['status']) => void,
    timeoutMs = 25000,
  ): Promise<string | null> {
    const deadline = Date.now() + timeoutMs
    let lastEmit = 0
    while (Date.now() < deadline) {
      const token = await this.readUserToken(page, context)
      if (token) return token

      const alert = await this.readLoginAlerts(page)
      if (/inv[aá]lid|incorret|senha|negado|bloquead|expirad|falha|erro/i.test(alert)) {
        throw new Error(alert.replace(/\s*\|\s*Carregamento conclu[ií]do/gi, '').trim())
      }

      if (Date.now() - lastEmit > 4000) {
        emit?.('login', 'Aguardando confirmação do login...', 'running')
        lastEmit = Date.now()
      }
      await page.waitForTimeout(400)
    }
    return null
  }

  private authHeaders(token: string): Record<string, string> {
    return {
      Authorization: `Bearer ${token}`,
      Accept: 'application/json',
      Origin: 'https://www.amil.com.br',
      Referer: `${BASE}/`,
    }
  }

  private async getJson(request: APIRequestContext, token: string, url: string): Promise<unknown> {
    const res = await request.get(url, { headers: this.authHeaders(token) })
    if (!res.ok()) throw new Error(`Amil API ${res.status()} em ${url.replace(BASE, '')}`)
    return res.json()
  }

  private async postJson(request: APIRequestContext, token: string, url: string, body: unknown): Promise<unknown> {
    const res = await request.post(url, {
      data: body,
      headers: {
        ...this.authHeaders(token),
        'Content-Type': 'application/json',
      },
    })
    if (!res.ok()) throw new Error(`Amil API ${res.status()} em ${url.replace(BASE, '')}`)
    return res.json()
  }

  private async fetchAuthorizations(
    request: APIRequestContext,
    token: string,
    marcaOtica: string,
    emit: (step: string, message: string, status: ScraperProgress['status']) => void,
    opts?: { silent?: boolean; periodStart?: Date },
  ): Promise<AmilAuthorizationItem[]> {
    const end = new Date()
    const start = opts?.periodStart ?? (() => {
      const s = new Date()
      s.setMonth(s.getMonth() - 12)
      return s
    })()

    const pageSize = 50
    let page = 1
    const collected: AmilAuthorizationItem[] = []
    const seen = new Set<string>()

    for (;;) {
      const inicio = page === 1 ? 1 : (page - 1) * pageSize + 1
      const body = {
        PeriodoIni: `${formatDateInput(start)}T00:00:00`,
        PeriodoFim: `${formatDateInput(end)}T23:59:59`,
        Consulta: true,
        Exame: true,
        Internacao: true,
        Validado: true,
        EmAnalise: true,
        NaoValidado: true,
        PendenteDocumentacao: true,
        Cancelado: true,
        Inicio: inicio,
        Tamanho: pageSize,
      }
      const raw = await this.postJson(request, token, `${API}/GuiasTokens/${marcaOtica}/PostTokens`, body)
      const root = asRecord(raw)
      const list = asArray(root?.pedidosAutorizacao)
      if (!list.length) break

      for (const item of list) {
        const rec = asRecord(item)
        if (!rec) continue
        const solicitationNumber = str(rec.numeroPedido)
        if (!solicitationNumber || seen.has(solicitationNumber)) continue
        seen.add(solicitationNumber)
        const statusLabel = str(
          rec.statusAutorizacaoBeneficiario,
          rec.situacaoInterna,
          rec.situacao,
        )
        collected.push({
          solicitationNumber,
          guidePassword: str(rec.senhaAutorizacao, rec.senha),
          guideNumber: solicitationNumber,
          token: str(rec.token),
          authorizationDate: str(rec.dataSolicitacao),
          validityDate: str(rec.dataValidade, rec.dataValidadeAutorizacao),
          status: mapAmilStatus(statusLabel),
          authorizationType: str(rec.tipoAtendimento, rec.tipo),
          classification: str(rec.tipoAtendimento, rec.classification),
          procedureDescription: str(rec.tipoAtendimento, rec.procedimento, rec.descricao) || 'Guia Amil',
          doctorName: str(rec.executante, rec.nomeExecutante, rec.medico),
          clinicName: str(rec.prestador, rec.nomePrestador, rec.local),
        })
      }

      if (!opts?.silent) {
        emit('fetch-autorizacoes', `${collected.length} guias/tokens...`, 'running')
      }
      if (list.length < pageSize) break
      page++
      if (page > 20) break
    }

    if (!opts?.silent) {
      emit('fetch-autorizacoes', `${collected.length} guias/tokens obtidos`, 'running')
    }
    return collected
  }
}
