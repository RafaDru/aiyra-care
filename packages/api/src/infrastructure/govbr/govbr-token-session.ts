import { chromium } from 'playwright'
import type { ScraperProgress } from '../../domain/scraper/health-portal-scraper.js'

const LOGIN_TIMEOUT = 5 * 60 * 1000
const EXPIRY_MARGIN_MS = 60_000
const TOKEN_URL_FRAGMENT = 'govbr-proxy.saude.gov.br/api/token/gerar'

export interface GovBrBrowserLoginConfig {
  startUrl: string
  navigateMessage?: string
  waitForGovBrButton?: boolean
}

export interface GovBrTokenSnapshot {
  accessToken: string
  expiresAtMs: number
  refreshToken?: string
}

/** Token FHIR gov.br-proxy — reutilizado entre ConecteSUS e Caderneta na mesma conta. */
export class GovBrTokenSession {
  private accessToken = ''
  private tokenExpiresAt = 0
  private refreshToken?: string

  hydrate(snapshot: GovBrTokenSnapshot): void {
    this.accessToken = snapshot.accessToken
    this.tokenExpiresAt = snapshot.expiresAtMs
    this.refreshToken = snapshot.refreshToken
  }

  snapshot(): GovBrTokenSnapshot | null {
    if (!this.accessToken || !this.isValid()) return null
    return {
      accessToken: this.accessToken,
      expiresAtMs: this.tokenExpiresAt,
      refreshToken: this.refreshToken,
    }
  }

  isValid(skewMs = EXPIRY_MARGIN_MS): boolean {
    return Boolean(this.accessToken) && Date.now() + skewMs < this.tokenExpiresAt
  }

  getAccessToken(): string {
    return this.accessToken
  }

  clear(): void {
    this.accessToken = ''
    this.tokenExpiresAt = 0
    this.refreshToken = undefined
  }

  async ensureToken(
    onProgress?: (p: ScraperProgress) => void,
    config?: GovBrBrowserLoginConfig,
  ): Promise<void> {
    if (this.isValid()) {
      onProgress?.({
        step: 'login',
        message: 'Sessão gov.br válida (sem abrir navegador)',
        status: 'success',
      })
      return
    }
    await this.loginViaBrowser(onProgress, config)
  }

  async loginViaBrowser(
    onProgress?: (p: ScraperProgress) => void,
    config?: GovBrBrowserLoginConfig,
  ): Promise<string> {
    const emit = (step: string, message: string, status: ScraperProgress['status']) =>
      onProgress?.({ step, message, status })

    const startUrl = config?.startUrl ?? 'https://meususdigital.saude.gov.br/login'

    const browser = await chromium.launch({
      headless: false,
      channel: 'chrome',
      args: ['--disable-blink-features=AutomationControlled'],
    })
    const context = await browser.newContext({
      locale: 'pt-BR',
      timezoneId: 'America/Sao_Paulo',
    })
    await context.addInitScript(() => {
      Object.defineProperty(Navigator.prototype, 'webdriver', { get: () => false })
    })
    const page = await context.newPage()

    try {
      const tokenPromise = page.waitForResponse(
        (r) => r.url().includes(TOKEN_URL_FRAGMENT) && r.status() === 200,
        { timeout: LOGIN_TIMEOUT },
      )

      emit('navigate', config?.navigateMessage ?? 'Abrindo Meu SUS Digital...', 'running')
      await page.goto(startUrl, { waitUntil: 'networkidle' })

      if (config?.waitForGovBrButton && !page.url().includes('sso.acesso.gov.br')) {
        emit('login', 'Clique em "Entrar com Gov.br" no navegador', 'running')
        const btn = await page.waitForSelector('text=Entrar com Gov.br', { timeout: 15000 }).catch(() => null)
        if (btn) {
          await btn.click()
          await page.waitForTimeout(3000)
        }
      }

      emit('login', 'Faça login no gov.br na janela aberta. Aguardando...', 'running')

      const response = await tokenPromise
      const body = await response.json() as {
        access_token?: string
        expires_in?: number
        refresh_token?: string
      }
      if (!body.access_token) throw new Error('Token gov.br não retornado')

      this.accessToken = body.access_token
      this.tokenExpiresAt = Date.now() + (body.expires_in || 3600) * 1000
      this.refreshToken = body.refresh_token ?? undefined

      emit('login', 'Login gov.br detectado! Coletando dados...', 'success')
      return this.accessToken
    } finally {
      await browser.close()
    }
  }
}
