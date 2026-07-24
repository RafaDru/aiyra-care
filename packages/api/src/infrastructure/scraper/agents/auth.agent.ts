import type { Page } from 'playwright'
import type { PortalCredentials } from '../../../domain/scraper/portal-credentials.js'
import type { GroqLlmAdapter } from '../../llm/groq-llm.adapter.js'
import type { ScraperError } from '../../../domain/scraper/health-portal-scraper.js'

const TRUNCATED = 3000

export class AuthAgent {
  constructor(private readonly llm: GroqLlmAdapter) {}

  async login(page: Page, credentials: PortalCredentials): Promise<ScraperError | null> {
    await page.waitForTimeout(3000)

    for (let attempt = 0; attempt < 5; attempt++) {
      const html = await page.content()
      const url = page.url()

      const loggedIn = await this.llm.extractJson<{ ok: boolean }>(
        'O usuário está logado? Se aparecer nome, menu, dashboard → ok:true.',
        html.slice(0, TRUNCATED),
      )
      if (loggedIn.ok) return null

      const mfa = await this.detectMfa(html)
      if (mfa) return { code: 'MFA_REQUIRED', message: 'gov.br solicitou 2FA. Scraper não suporta autenticação em duas etapas.', pageSnapshot: html.slice(0, 2000) }

      const filled = await this.fillFields(page, credentials, html)
      if (!filled) {
        return { code: 'AUTH_FAILED', message: 'Não foi possível identificar campos de login', pageSnapshot: html.slice(0, 2000) }
      }

      await this.clickSubmit(page, html)
      await page.waitForTimeout(3000)
    }

    return { code: 'AUTH_FAILED', message: 'Máximo de tentativas excedido', pageSnapshot: '' }
  }

  private async detectMfa(html: string): Promise<boolean> {
    const hasCode = /código|token|sms|whatsapp|autenticador|2fa/i.test(html.slice(0, TRUNCATED))
    if (!hasCode) return false

    const r = await this.llm.extractJson<{ mfa: boolean }>(
      'A página está pedindo um código de autenticação (2FA/MFA)?',
      html.slice(0, TRUNCATED),
    )
    return r.mfa
  }

  private async fillFields(page: Page, creds: PortalCredentials, html: string): Promise<boolean> {
    const cpfInput = await page.$('input[name="login"], input#login, input[name="cpf"], input#cpf')
    const passInput = await page.$('input[type="password"]')

    if (cpfInput && passInput) {
      await cpfInput.fill(creds.cpf)
      await passInput.fill(creds.password)
      return true
    }

    const r = await this.llm.extractJson<{ fields: Array<{ selector: string; type: string }> }>(
      'Encontre os seletores CSS dos campos de CPF/usuário e senha. Retorne fields: [{selector, type: "cpf"|"password"|"birthdate"}].',
      html.slice(0, TRUNCATED),
    )

    if (!r.fields?.length) return false

    for (const f of r.fields) {
      const el = await page.$(f.selector)
      if (!el) continue
      if (f.type === 'cpf') await el.fill(creds.cpf)
      else if (f.type === 'password') await el.fill(creds.password)
      else if (f.type === 'birthdate' && creds.birthDate) await el.fill(creds.birthDate)
    }

    return true
  }

  private async clickSubmit(page: Page, html: string): Promise<void> {
    const btn = await page.$('button[type="submit"], input[type="submit"], button:has-text("Continuar"), button:has-text("Entrar"), button:has-text("Acessar")')
    if (btn) { await btn.click(); return }

    const r = await this.llm.extractJson<{ selector: string }>(
      'Seletor CSS do botão de submit/login.',
      html.slice(0, TRUNCATED),
    )
    if (r.selector) {
      const el = await page.$(r.selector)
      if (el) await el.click()
    }
  }
}
