import { chromium, type Browser, type BrowserContext, type Page } from 'playwright'

export async function loginUnimedBh(email: string, password: string): Promise<{ browser: Browser; context: BrowserContext; page: Page }> {
  const browser = await chromium.launch({ headless: false, channel: 'chrome', args: ['--disable-blink-features=AutomationControlled'] })
  const context = await browser.newContext({ locale: 'pt-BR', timezoneId: 'America/Sao_Paulo' })
  await context.addInitScript(() => { Object.defineProperty(Navigator.prototype, 'webdriver', { get: () => false }) })
  const page = await context.newPage()

  await page.goto('https://acesso.unimedbh.com.br/?force=true&redirect=https:%2F%2Fapp.unimedbh.com.br%2FPortalDoCliente%2F', { waitUntil: 'networkidle', timeout: 30000 })

  await page.waitForSelector('#username', { timeout: 10000 })
  await page.fill('#username', email)
  await page.fill('#password', password)
  await page.click('button:has-text("Entrar")')

  await page.waitForTimeout(3000)
  const loggedIn = !page.url().includes('acesso.unimed')
  if (!loggedIn) {
    const errorEl = await page.$('[role="alert"]')
    const errorText = errorEl ? await errorEl.textContent() : 'Falha na autenticação'
    await browser.close()
    throw new Error(errorText || 'Falha na autenticação')
  }

  return { browser, context, page }
}
