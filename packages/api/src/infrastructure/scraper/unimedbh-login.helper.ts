import { chromium, type Browser, type BrowserContext, type Page } from 'playwright'
import { preparePortalPage, dismissPortalBlockingUi } from './portal-browser-ui.helper.js'

const SUCCESS_ALERT = /parab[eé]ns|validados?\s+com\s+sucesso|login\s+realizado|autenticado/i
const FAILURE_ALERT = /inv[aá]lid|incorret|erro|falha|bloquead|expirad|obrigat[oó]ri/i
const PORTAL_HOME = 'https://app.unimedbh.com.br/PortalDoCliente/'
const EXTRATO_PROBE_URL = 'https://app.unimedbh.com.br/PortalDoCliente/ExtratoUtilizacao'
const LOGIN_URL =
  'https://acesso.unimedbh.com.br/?force=true&redirect=https:%2F%2Fapp.unimedbh.com.br%2FPortalDoCliente%2F'

/** Página de login SSO (sessão expirada ou redirect pendente). */
export function isUnimedLoginPage(url: string): boolean {
  try {
    return new URL(url).hostname === 'acesso.unimedbh.com.br'
  } catch {
    return false
  }
}

export function unimedSessionExpiredMessage(pageUrl: string): string {
  return `Sessão Unimed expirada — faça login em Sincronizar (página=${pageUrl})`
}

/** Host real do portal — não confundir com `PortalDoCliente` no query `redirect` do SSO. */
export function isOnUnimedPortalApp(url: string): boolean {
  try {
    const u = new URL(url)
    return u.hostname === 'app.unimedbh.com.br' && u.pathname.startsWith('/PortalDoCliente')
  } catch {
    return false
  }
}

/** TTL indicativo — a validação real é tentar o portal com storageState salvo. */
export const UNIMED_SESSION_TTL_MS = 48 * 60 * 60 * 1000

export function unimedSessionExpiresAt(): Date {
  return new Date(Date.now() + UNIMED_SESSION_TTL_MS)
}

export function isUnimedSessionUsable(expiresAt: Date | null | undefined, skewMs = 60_000): boolean {
  if (!expiresAt) return false
  return expiresAt.getTime() > Date.now() + skewMs
}

function isHeadless(): boolean {
  const v = (process.env.UNIMED_HEADLESS ?? 'true').toLowerCase()
  return v !== '0' && v !== 'false' && v !== 'no'
}

async function launchBrowser(headless?: boolean): Promise<Browser> {
  return chromium.launch({
    headless: headless ?? isHeadless(),
    channel: 'chrome',
    args: ['--disable-blink-features=AutomationControlled'],
  })
}

async function newStealthContext(browser: Browser, storageStateJson?: string): Promise<BrowserContext> {
  const opts: NonNullable<Parameters<Browser['newContext']>[0]> = {
    locale: 'pt-BR',
    timezoneId: 'America/Sao_Paulo',
  }
  if (storageStateJson) {
    opts.storageState = JSON.parse(storageStateJson) as NonNullable<Parameters<Browser['newContext']>[0]>['storageState']
  }
  const context = await browser.newContext(opts)
  await context.addInitScript(() => {
    Object.defineProperty(Navigator.prototype, 'webdriver', { get: () => false })
  })
  return context
}

export async function isUnimedPortalLoggedIn(page: Page): Promise<boolean> {
  return isOnUnimedPortalApp(page.url())
}

export async function captureUnimedStorageState(context: BrowserContext): Promise<string> {
  return JSON.stringify(await context.storageState())
}

/** Valida sessão salva com navegação ao extrato (não só home). */
async function probeStoredSession(page: Page): Promise<boolean> {
  await page.goto(EXTRATO_PROBE_URL, { waitUntil: 'domcontentloaded', timeout: 45000 })
  await dismissPortalBlockingUi(page)
  await page.waitForTimeout(800)
  if (isUnimedLoginPage(page.url())) return false
  return isOnUnimedPortalApp(page.url())
}

async function performCredentialLogin(
  browser: Browser,
  email: string,
  password: string,
): Promise<{ browser: Browser; context: BrowserContext; page: Page }> {
  const context = await newStealthContext(browser)
  const page = await context.newPage()
  await preparePortalPage(page)

  await page.goto(LOGIN_URL, { waitUntil: 'domcontentloaded', timeout: 45000 })
  await dismissPortalBlockingUi(page)

  await page.waitForSelector('#username', { timeout: 15000 })
  await page.fill('#username', email)
  await page.fill('#password', password)

  await Promise.all([
    page.click('button:has-text("Entrar")'),
    page.waitForURL((url) => isOnUnimedPortalApp(url.href), { timeout: 45000 }).catch(() => null),
  ])

  await page.waitForTimeout(1500)

  if (!isOnUnimedPortalApp(page.url())) {
    const alerts = await page.locator('[role="alert"]').allTextContents().catch(() => [] as string[])
    const texts = alerts.map((t) => t.trim()).filter(Boolean)

    const onlySuccess = texts.length > 0 && texts.every((t) => SUCCESS_ALERT.test(t) && !FAILURE_ALERT.test(t))
    if (onlySuccess) {
      await page.waitForURL((url) => isOnUnimedPortalApp(url.href), { timeout: 30000 })
    } else {
      const realError = texts.find((t) => FAILURE_ALERT.test(t) && !SUCCESS_ALERT.test(t))
      throw new Error(realError || texts[0] || 'Falha na autenticação Unimed BH')
    }
  }

  if (!isOnUnimedPortalApp(page.url())) {
    throw new Error('Login Unimed BH não redirecionou para o Portal do Cliente')
  }

  return { browser, context, page }
}

export interface UnimedBhSession {
  browser: Browser
  context: BrowserContext
  page: Page
  usedStoredSession: boolean
}

/**
 * Abre sessão no Portal do Cliente — reutiliza cookies/localStorage salvos ou faz login.
 */
export async function acquireUnimedBhSession(
  email: string,
  password: string,
  opts?: { storageStateJson?: string },
): Promise<UnimedBhSession> {
  if (opts?.storageStateJson) {
    const browser = await launchBrowser(true)
    try {
      const context = await newStealthContext(browser, opts.storageStateJson)
      const page = await context.newPage()
      await preparePortalPage(page)
      await page.goto(PORTAL_HOME, { waitUntil: 'domcontentloaded', timeout: 45000 })
      await page.waitForTimeout(1200)
      if (!(await isUnimedPortalLoggedIn(page))) {
        await context.close().catch(() => {})
        await browser.close().catch(() => {})
      } else if (await probeStoredSession(page)) {
        return { browser, context, page, usedStoredSession: true }
      } else {
        await context.close().catch(() => {})
        await browser.close().catch(() => {})
      }
    } catch {
      await browser.close().catch(() => {})
    }
  }

  const browser = await launchBrowser()
  try {
    const session = await performCredentialLogin(browser, email, password)
    return { ...session, usedStoredSession: false }
  } catch (err) {
    await browser.close().catch(() => {})
    throw err
  }
}

/** @deprecated Use acquireUnimedBhSession */
export async function loginUnimedBh(
  email: string,
  password: string,
): Promise<{ browser: Browser; context: BrowserContext; page: Page }> {
  const { browser, context, page } = await acquireUnimedBhSession(email, password)
  return { browser, context, page }
}
