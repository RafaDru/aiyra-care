import type { Page, Response } from 'playwright'
import {
  attachPortalDialogHandler,
  dismissPortalBlockingUi,
} from './portal-browser-ui.helper.js'
import {
  hermesPardiniPortalEntryUrl,
  fleuryPrecisionUnifiedEntryUrl,
  hermesPardiniResultadosExameUrl,
  fleuryPrecisionOtpInApp,
} from './hermes-pardini.portal.js'
import {
  registerHermesPardiniOtpSession,
  unregisterHermesPardiniOtpSession,
  waitHermesPardiniOtpCode,
} from './hermes-pardini-otp-session.js'

import { formatHermesPardiniUsername } from './hermes-pardini-auth.js'

export interface CapturedOidcTokens {
  accessToken: string
  refreshToken: string
}

/** Headers observados no GET /pedidos do browser (replay na API HTTP). */
export type HermesPardiniPedidosRequestHeaders = Record<string, string>

export interface HermesPardiniBrowserLoginResult {
  tokens: CapturedOidcTokens
  pedidosRequestHeaders?: HermesPardiniPedidosRequestHeaders
}

const USERNAME_LOCATOR = '#username, #_username, input[name="username"]'
const PASSWORD_LOCATOR = '#password, #_password, input[name="password"]'
const OTP_LOCATOR = [
  '#otp',
  '#_otp',
  'input[name="otp"]',
  'input[name="code"]',
  '#code',
  '#_code',
  'input[autocomplete="one-time-code"]',
  'input[inputmode="numeric"]',
].join(', ')

/** Funções `page.evaluate` como string — evita `__name is not defined` com tsx. */
const EVAL_TROCAR_PASSWORD_LOGIN = `() => {
  const fn = window.trocarParaPasswordLogin;
  if (typeof fn === 'function') fn();
}`

const EVAL_SHOW_PASSWORD_LOGIN_FORM = `() => {
  const formName = document.getElementById('_login-type');
  if (formName) formName.value = 'password';
  const cpf = document.getElementById('_cpf');
  const birth = document.getElementById('_birthdate');
  const userWrap = document.getElementById('_username') && document.getElementById('_username').closest('.mdc-text-field');
  const pwdWrap = document.getElementById('_password') && document.getElementById('_password').closest('.mdc-text-field');
  if (cpf && cpf.closest('.mdc-text-field')) cpf.closest('.mdc-text-field').style.display = 'none';
  if (birth && birth.closest('.mdc-text-field')) birth.closest('.mdc-text-field').style.display = 'none';
  if (userWrap) userWrap.style.display = '';
  if (pwdWrap) pwdWrap.style.display = '';
}`

const EVAL_EXTRACT_OIDC_FROM_STORAGE = `() => {
  const stores = [localStorage, sessionStorage];
  for (let s = 0; s < stores.length; s++) {
    const store = stores[s];
    for (let i = 0; i < store.length; i++) {
      const key = store.key(i);
      if (!key) continue;
      const raw = store.getItem(key);
      if (!raw) continue;
      try {
        const json = JSON.parse(raw);
        if (json && json.access_token) {
          return { accessToken: json.access_token, refreshToken: json.refresh_token || '' };
        }
      } catch (e) { void e; }
      if (raw.length > 100 && raw.split('.').length === 3) {
        return { accessToken: raw, refreshToken: '' };
      }
    }
  }
  return null;
}`

const EVAL_FORM_REQUEST_SUBMIT = `(el) => {
  if (el && typeof el.requestSubmit === 'function') el.requestSubmit();
}`

const EVAL_FILL_HERMES_CREDENTIALS = `(args) => {
  const ids = ['_username', 'username'];
  const pwdIds = ['_password', 'password'];
  let userEl = null;
  for (let i = 0; i < ids.length; i++) {
    const el = document.getElementById(ids[i]);
    if (el instanceof HTMLInputElement) { userEl = el; break; }
  }
  let pwdEl = null;
  for (let j = 0; j < pwdIds.length; j++) {
    const el = document.getElementById(pwdIds[j]);
    if (el instanceof HTMLInputElement) { pwdEl = el; break; }
  }
  if (userEl) {
    userEl.focus();
    userEl.value = args.login;
    userEl.dispatchEvent(new Event('input', { bubbles: true }));
    userEl.dispatchEvent(new Event('change', { bubbles: true }));
  }
  if (pwdEl) {
    pwdEl.focus();
    pwdEl.value = args.password;
    pwdEl.dispatchEvent(new Event('input', { bubbles: true }));
    pwdEl.dispatchEvent(new Event('change', { bubbles: true }));
  }
  return {
    user: userEl ? userEl.value : '',
    pwd: pwdEl ? (pwdEl.value ? 'set' : '') : '',
  };
}`

/** Headless só se explícito ou sync não-interativo; manual abre browser visível por padrão. */
export function hermesPardiniBrowserHeadless(interactiveLogin?: boolean): boolean {
  const env = process.env.HERMES_PARDINI_HEADLESS
  if (env === '0') return false
  if (env === '1') return true
  return !interactiveLogin
}

/** Aceita alert/confirm nativos — alias do helper compartilhado. */
export function attachHermesPardiniDialogHandler(page: Page): void {
  attachPortalDialogHandler(page)
}

/** Modais do portal Precision Care / Keycloak (inclui alerta de fraude Hermes). */
export async function dismissHermesPardiniSecurityModal(page: Page): Promise<void> {
  await dismissPortalBlockingUi(page)
}

/** URL do fluxo OIDC / shell de login Precision Care (não exige já estar em /pedidos). */
export function isHermesPardiniLoginUrl(url: string): boolean {
  if (/openid-connect\/auth/i.test(url)) return true
  if (/customer\/account\/login/i.test(url)) return true
  if (/sso\.grupofleury\.com\.br/i.test(url) && /\/auth\//i.test(url)) return true
  if (/realms\/grupopardini/i.test(url)) return true
  if (/resultados\.grupofleury\.com\.br/i.test(url) && /origin=pardini/i.test(url)) return true
  return false
}

/** Campos usuário/senha presentes no DOM (podem estar ocultos no fluxo CPF+data). */
export async function hasHermesPardiniCredentialFields(page: Page): Promise<boolean> {
  const userCount = await page.locator(USERNAME_LOCATOR).count()
  const pwdCount = await page.locator(PASSWORD_LOCATOR).count()
  return userCount > 0 && pwdCount > 0
}

/** Deve preencher credenciais automaticamente (não quando já na lista de resultados). */
export async function shouldHermesPardiniAutoLogin(page: Page): Promise<boolean> {
  const url = page.url()
  if (/portalpaciente\/resultados/i.test(url)) return false
  if (await isHermesPardiniLoginPage(page)) return true
  return await hasHermesPardiniCredentialFields(page)
}

/** Aguarda portal ou Keycloak (não exige formulário se já autenticado). */
export async function waitForHermesPardiniPortalOrLogin(page: Page): Promise<void> {
  const deadline = Date.now() + 60_000
  while (Date.now() < deadline) {
    await dismissHermesPardiniSecurityModal(page).catch(() => {})
    const url = page.url()
    if (/portalpaciente/i.test(url)) break
    const hasPwdToggle = await page.locator('#_button-password').count() > 0
    const userVisible = await page.locator(USERNAME_LOCATOR).first()
      .isVisible({ timeout: 200 }).catch(() => false)
    const pwdVisible = await page.locator(PASSWORD_LOCATOR).first()
      .isVisible({ timeout: 100 }).catch(() => false)
    if (userVisible && pwdVisible) break
    if (/openid-connect\/auth/i.test(url) && hasPwdToggle) break
    if (await hasHermesPardiniCredentialFields(page) && hasPwdToggle) break
    await page.waitForTimeout(400)
  }
  await dismissHermesPardiniSecurityModal(page)
}

export async function openHermesPardiniPortalLogin(page: Page): Promise<void> {
  await page.goto(hermesPardiniPortalEntryUrl(), { waitUntil: 'domcontentloaded', timeout: 60_000 })
  await waitForHermesPardiniPortalOrLogin(page)
}

/** Portal unificado Grupo Fleury (OTP SMS/e-mail/WhatsApp — sem `origin=pardini`). */
export async function openFleuryPrecisionUnifiedPortal(page: Page): Promise<void> {
  await page.goto(fleuryPrecisionUnifiedEntryUrl(), { waitUntil: 'domcontentloaded', timeout: 60_000 })
  await waitForHermesPardiniPortalOrLogin(page)
}

/** Abre a lista de resultados — garante chamada à API /pedidos. */
export async function navigateHermesPardiniResultadosExame(page: Page): Promise<void> {
  const target = hermesPardiniResultadosExameUrl()
  if (!page.url().includes('portalpaciente/resultadosExame')) {
    await page.goto(target, { waitUntil: 'domcontentloaded', timeout: 60_000 })
  }
  await dismissHermesPardiniSecurityModal(page)
}

async function switchToHermesPardiniPasswordLogin(page: Page): Promise<void> {
  const username = page.locator(USERNAME_LOCATOR).first()
  const pwd = page.locator(PASSWORD_LOCATOR).first()
  const passwordBtn = page.locator('#_button-password, button[id="_button-password"]')

  const deadline = Date.now() + 30_000
  while (Date.now() < deadline) {
    await dismissHermesPardiniSecurityModal(page).catch(() => {})

    const userVisible = await username.isVisible({ timeout: 500 }).catch(() => false)
    const pwdVisible = await pwd.isVisible({ timeout: 200 }).catch(() => false)
    if (userVisible && pwdVisible) return

    if (await passwordBtn.count() > 0) {
      await page.evaluate(EVAL_TROCAR_PASSWORD_LOGIN).catch(() => {})
      await passwordBtn.first().click({ force: true, timeout: 5000 }).catch(() => {})
      await page.evaluate(EVAL_SHOW_PASSWORD_LOGIN_FORM).catch(() => {})
      await page.waitForTimeout(500)
      continue
    }

    const passwordToggle = page.getByRole('button', { name: /^entrar com senha$/i })
    if (await passwordToggle.isVisible({ timeout: 500 }).catch(() => false)) {
      await passwordToggle.click({ force: true, timeout: 5000 }).catch(() => {})
      await page.waitForTimeout(500)
      continue
    }

    await page.waitForTimeout(400)
  }
}

/** Garante formulário usuário/senha (não CPF+data de nascimento). */
export async function ensureHermesPardiniPasswordLoginForm(page: Page): Promise<void> {
  if (!await shouldHermesPardiniAutoLogin(page)) return

  await switchToHermesPardiniPasswordLogin(page)

  const username = page.locator(USERNAME_LOCATOR)
  const visible = await username.first().isVisible({ timeout: 3000 }).catch(() => false)
  if (!visible) {
    await page.evaluate(EVAL_SHOW_PASSWORD_LOGIN_FORM)
  }

  await username.first().waitFor({ state: 'attached', timeout: 20_000 })
}

export async function fillHermesPardiniUsernameForm(page: Page, login: string): Promise<void> {
  const username = page.locator(USERNAME_LOCATOR)
  await username.first().waitFor({ state: 'attached', timeout: 20_000 }).catch(() => {})
  await dismissHermesPardiniSecurityModal(page)
  const formattedLogin = formatHermesPardiniUsername(login)
  if (!formattedLogin) return
  if (await username.first().isVisible({ timeout: 2000 }).catch(() => false)) {
    await username.first().click({ force: true, timeout: 5000 }).catch(() => {})
    await username.first().fill(formattedLogin, { force: true })
  }
}

export async function submitHermesPardiniUsernameForm(page: Page): Promise<void> {
  await dismissHermesPardiniSecurityModal(page)
  const proceed = page.locator(
    'button#_prosseguir-button:not(#_prosseguir-button-password):not(#_prosseguir-button-birthdate), button[id="_prosseguir-button-username"]',
  ).first()
  const kcSubmit = page.locator(
    '#kc-form-login button[type="submit"], button[name="login"]',
  ).first()

  if (await proceed.isVisible({ timeout: 3000 }).catch(() => false)) {
    await proceed.click({ force: true, timeout: 10_000 })
    return
  }
  if (await proceed.count() > 0) {
    await proceed.click({ force: true, timeout: 10_000 }).catch(() => {})
    return
  }
  if (await kcSubmit.isVisible({ timeout: 2000 }).catch(() => false)) {
    await kcSubmit.click({ force: true, timeout: 10_000 })
  }
}

/** Seleciona canal OTP (SMS, WhatsApp ou e-mail) quando o portal exige escolha. */
export async function trySelectFleuryOtpChannel(page: Page): Promise<boolean> {
  const channelPatterns = [/sms/i, /whatsapp/i, /e-?mail/i]
  for (const pattern of channelPatterns) {
    const btn = page.getByRole('button', { name: pattern }).first()
    if (await btn.isVisible({ timeout: 800 }).catch(() => false)) {
      await btn.click({ force: true, timeout: 5000 }).catch(() => {})
      return true
    }
  }
  return false
}

export async function isHermesPardiniOtpFieldVisible(page: Page): Promise<boolean> {
  const otp = page.locator(OTP_LOCATOR).first()
  return await otp.isVisible({ timeout: 500 }).catch(() => false)
}

export async function waitForHermesPardiniOtpField(page: Page, timeoutMs = 45_000): Promise<void> {
  const deadline = Date.now() + timeoutMs
  while (Date.now() < deadline) {
    await dismissHermesPardiniSecurityModal(page).catch(() => {})
    await trySelectFleuryOtpChannel(page).catch(() => {})
    if (await isHermesPardiniOtpFieldVisible(page)) return
    await page.waitForTimeout(400)
  }
  throw new Error('Campo de código OTP não apareceu no portal Grupo Fleury')
}

export async function fillHermesPardiniOtpForm(page: Page, code: string): Promise<void> {
  const digits = code.replace(/\D/g, '')
  const otp = page.locator(OTP_LOCATOR).first()
  await otp.waitFor({ state: 'visible', timeout: 15_000 })
  await otp.click({ force: true, timeout: 5000 }).catch(() => {})
  await otp.fill(digits, { force: true })
}

export async function submitHermesPardiniOtpForm(page: Page): Promise<void> {
  await dismissHermesPardiniSecurityModal(page)
  const otpSubmit = page.locator(
    'button[id*="otp"], button[id*="_prosseguir"], button[type="submit"]',
  ).first()
  const entrarBtn = page.getByRole('button', { name: /^entrar$|^confirmar$|^validar$/i }).first()

  if (await otpSubmit.isVisible({ timeout: 3000 }).catch(() => false)) {
    await otpSubmit.click({ force: true, timeout: 10_000 })
    return
  }
  if (await entrarBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
    await entrarBtn.click({ force: true, timeout: 10_000 })
  }
}

export async function fillHermesPardiniPasswordForm(
  page: Page,
  login: string,
  password: string,
): Promise<void> {
  await ensureHermesPardiniPasswordLoginForm(page)
  const username = page.locator(USERNAME_LOCATOR)
  const pwd = page.locator(PASSWORD_LOCATOR)
  await username.first().waitFor({ state: 'attached', timeout: 20_000 })
  await username.first().waitFor({ state: 'visible', timeout: 15_000 })

  await dismissHermesPardiniSecurityModal(page)
  const formattedLogin = formatHermesPardiniUsername(login)

  await username.first().click({ force: true, timeout: 5000 }).catch(() => {})
  await username.first().fill(formattedLogin, { force: true })
  await pwd.first().click({ force: true, timeout: 5000 }).catch(() => {})
  await pwd.first().fill(password, { force: true })

  const filled = await page.evaluate(EVAL_FILL_HERMES_CREDENTIALS, {
    login: formattedLogin,
    password,
  }).catch(() => null)
  const domUser = await username.first().inputValue({ timeout: 1000 }).catch(() => '')
  if (!domUser) {
    await page.evaluate(EVAL_FILL_HERMES_CREDENTIALS, { login: formattedLogin, password })
  }
  if (filled && !filled.user) {
    await page.evaluate(EVAL_FILL_HERMES_CREDENTIALS, { login: formattedLogin, password })
  }
}

export async function submitHermesPardiniPasswordForm(page: Page): Promise<void> {
  await dismissHermesPardiniSecurityModal(page)
  const passwordSubmit = page.locator(
    'button[id="_prosseguir-button-password"], button#_prosseguir-button:not(#_prosseguir-button-birthdate)',
  ).first()
  const kcSubmit = page.locator(
    '#kc-form-login button[type="submit"], button[name="login"]',
  ).first()
  const entrarBtn = page.getByRole('button', { name: /^entrar$/i })

  if (await passwordSubmit.isVisible({ timeout: 3000 }).catch(() => false)) {
    await passwordSubmit.click({ force: true, timeout: 10_000 })
    return
  }
  if (await passwordSubmit.count() > 0) {
    await passwordSubmit.click({ force: true, timeout: 10_000 }).catch(() => {})
    return
  }
  if (await kcSubmit.isVisible({ timeout: 2000 }).catch(() => false)) {
    await kcSubmit.click({ force: true, timeout: 10_000 })
    return
  }
  if (await entrarBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
    await entrarBtn.click({ force: true, timeout: 10_000 })
    return
  }
  const form = page.locator('#kc-form-login')
  if (await form.count() > 0) {
    await form.evaluate(EVAL_FORM_REQUEST_SUBMIT)
  }
}

function bearerFromRequest(response: Response): string | null {
  const headers = response.request().headers()
  const auth = headers.authorization ?? headers.Authorization
  if (!auth?.startsWith('Bearer ')) return null
  return auth.slice(7)
}

/** Copia headers do request /pedidos que o SPA envia (sem Authorization — usamos o token explícito). */
export function pickHermesPardiniPedidosRequestHeaders(
  raw: Record<string, string>,
): HermesPardiniPedidosRequestHeaders {
  const out: HermesPardiniPedidosRequestHeaders = {}
  for (const [key, value] of Object.entries(raw)) {
    if (!value) continue
    const lower = key.toLowerCase()
    if (lower === 'authorization' || lower === 'cookie') continue
    if (lower.startsWith('sec-')) continue
    if (lower === 'user-agent' || lower === 'host' || lower === 'content-length') continue
    out[key] = value
  }
  return out
}

function isPacientePedidosUrl(url: string): boolean {
  return /\/paciente\/api\/v1\/pedidos/i.test(url)
}

function isOidcTokenUrl(url: string): boolean {
  return url.includes('/openid-connect/token')
}

function isPacienteApiTokenGrant(postData: string): boolean {
  return /grant_type=(authorization_code|refresh_token)/.test(postData)
}

async function extractTokenFromBrowserStorage(page: Page): Promise<CapturedOidcTokens | null> {
  return page.evaluate(EVAL_EXTRACT_OIDC_FROM_STORAGE)
}

export function attachHermesPardiniTokenCapture(
  page: Page,
  creds?: { login: string; password: string },
): {
  waitForTokens: (timeoutMs?: number) => Promise<HermesPardiniBrowserLoginResult>
} {
  let captured: CapturedOidcTokens | null = null
  let refreshToken = ''
  let pedidosOk = false
  let authCodeToken = false
  let pedidosRequestHeaders: HermesPardiniPedidosRequestHeaders | undefined

  const applyTokens = (accessToken: string, refresh?: string, fromAuthCode = false) => {
    if (refresh) refreshToken = refresh
    if (fromAuthCode) authCodeToken = true
    captured = {
      accessToken,
      refreshToken: refresh ?? refreshToken,
    }
  }

  const onTokenResponse = async (response: Response) => {
    if (!isOidcTokenUrl(response.url())) return
    if (response.status() < 200 || response.status() >= 300) return
    const postData = response.request().postData() ?? ''
    const fromAuthCode = postData.includes('grant_type=authorization_code')
    if (postData && !isPacienteApiTokenGrant(postData)) return
    try {
      const json = await response.json() as { access_token?: string; refresh_token?: string }
      if (json.access_token) {
        applyTokens(json.access_token, json.refresh_token ?? undefined, fromAuthCode)
      }
    } catch { /* ignore */ }
  }

  const onPedidosResponse = (response: Response) => {
    if (!isPacientePedidosUrl(response.url())) return
    if (response.status() !== 200) return
    pedidosOk = true
    pedidosRequestHeaders = pickHermesPardiniPedidosRequestHeaders(response.request().headers())
    const bearer = bearerFromRequest(response)
    if (bearer) applyTokens(bearer, undefined, true)
  }

  const handler = (response: Response) => {
    void onTokenResponse(response)
    onPedidosResponse(response)
  }

  page.on('response', handler)
  page.context().on('response', handler)

  return {
    waitForTokens: async (timeoutMs = 120_000) => {
      const deadline = Date.now() + timeoutMs

      while (Date.now() < deadline) {
        await dismissHermesPardiniSecurityModal(page).catch(() => {})

        if (creds?.login && creds.password && await shouldHermesPardiniAutoLogin(page)) {
          const currentUser = await page.locator(USERNAME_LOCATOR).first()
            .inputValue({ timeout: 200 }).catch(() => '')
          if (!currentUser.trim()) {
            await fillHermesPardiniPasswordForm(page, creds.login, creds.password).catch(() => {})
            await submitHermesPardiniPasswordForm(page).catch(() => {})
          }
        }

        if (pedidosOk && captured) {
          return { tokens: captured, pedidosRequestHeaders }
        }

        if (captured && authCodeToken && !pedidosOk) {
          await navigateHermesPardiniResultadosExame(page).catch(() => {})
        }

        if (!pedidosOk) {
          const storage = await extractTokenFromBrowserStorage(page)
          if (storage) applyTokens(storage.accessToken, storage.refreshToken, false)
        }

        const errText = await page.locator('.alert-error, .kc-feedback-text, [class*="error"]').first()
          .textContent({ timeout: 100 }).catch(() => null)
        if (errText && /senha|usu[aá]rio|inv[aá]lid/i.test(errText)) {
          throw new Error(`Login Hermes Pardini rejeitado: ${errText.trim().slice(0, 120)}`)
        }

        await page.waitForTimeout(350)
      }

      const onLoginPage = await isHermesPardiniLoginPage(page)
      throw new Error(
        onLoginPage
          ? 'Token OIDC Hermes Pardini não capturado — verifique usuário/senha do protocolo no portal'
          : 'Portal Hermes Pardini não carregou resultados — API /pedidos não respondeu',
      )
    },
  }
}

/**
 * Login via browser (OAuth PKCE) — navega até resultados e aguarda /pedidos 200.
 * Entrada unificada: OTP no Chrome (SMS/e-mail/WhatsApp). Legada: `?origin=pardini` + senha protocolo.
 */
export async function loginHermesPardiniViaBrowser(
  page: Page,
  login: string,
  password: string,
  opts?: {
    tokenTimeoutMs?: number
    /** `true` = resultados.grupofleury.com.br sem `origin=pardini` (OTP). */
    unifiedEntry?: boolean
    /** Preenche senha do protocolo no formulário (default false na entrada unificada). */
    autoFillPassword?: boolean
    /** Pré-preenche CPF/código na entrada unificada. */
    prefillUsername?: boolean
    /** OTP digitado no app — jobId + callback ao aguardar código. */
    otpInApp?: { jobId: string; onAwaitingOtp?: () => void }
  },
): Promise<HermesPardiniBrowserLoginResult> {
  const unifiedEntry = opts?.unifiedEntry ?? false
  const autoFillPassword = opts?.autoFillPassword ?? !unifiedEntry
  const tokenTimeoutMs = opts?.tokenTimeoutMs
    ?? (unifiedEntry ? 180_000 : 120_000)
  const useOtpInApp = unifiedEntry
    && opts?.otpInApp?.jobId
    && fleuryPrecisionOtpInApp()

  attachHermesPardiniDialogHandler(page)
  const capture = attachHermesPardiniTokenCapture(
    page,
    autoFillPassword && !useOtpInApp && login?.trim() && password
      ? { login, password }
      : undefined,
  )

  if (useOtpInApp && opts?.otpInApp) {
    const { jobId, onAwaitingOtp } = opts.otpInApp
    registerHermesPardiniOtpSession(jobId, page)
    try {
      await openFleuryPrecisionUnifiedPortal(page)
      if (opts.prefillUsername && login?.trim()) {
        await fillHermesPardiniUsernameForm(page, login)
      }
      await submitHermesPardiniUsernameForm(page)
      await waitForHermesPardiniOtpField(page, 60_000)
      const codePromise = waitHermesPardiniOtpCode(jobId, tokenTimeoutMs)
      onAwaitingOtp?.()
      const code = await codePromise
      await fillHermesPardiniOtpForm(page, code)
      await submitHermesPardiniOtpForm(page)
      await navigateHermesPardiniResultadosExame(page)
      return capture.waitForTokens(tokenTimeoutMs)
    } finally {
      unregisterHermesPardiniOtpSession(jobId)
    }
  }

  if (unifiedEntry) {
    await openFleuryPrecisionUnifiedPortal(page)
    if (opts?.prefillUsername && login?.trim()) {
      await fillHermesPardiniUsernameForm(page, login).catch(() => {})
    }
  } else {
    await openHermesPardiniPortalLogin(page)
  }

  const shouldLogin = autoFillPassword
    && login?.trim()
    && password
    && await shouldHermesPardiniAutoLogin(page)
  if (shouldLogin) {
    await page.locator('#_button-password, #_username, #username').first()
      .waitFor({ state: 'attached', timeout: 45_000 })
    await dismissHermesPardiniSecurityModal(page)
    await fillHermesPardiniPasswordForm(page, login, password)
    await submitHermesPardiniPasswordForm(page)
    await page.waitForURL(/grupofleury\.com\.br/i, { timeout: 90_000 }).catch(() => {})
  }

  await navigateHermesPardiniResultadosExame(page)
  return capture.waitForTokens(tokenTimeoutMs)
}

/** Heurística: ainda na página de login Keycloak ou shell Precision Care. */
export async function isHermesPardiniLoginPage(page: Page): Promise<boolean> {
  return isHermesPardiniLoginUrl(page.url())
}
