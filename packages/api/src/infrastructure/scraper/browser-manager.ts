import { chromium, type Browser, type Page } from 'playwright'

export class BrowserManager {
  private browser: Browser | null = null
  private page: Page | null = null

  async start(headless = true): Promise<Page> {
    this.browser = await chromium.launch({ headless })
    const context = await this.browser.newContext({
      locale: 'pt-BR',
      timezoneId: 'America/Sao_Paulo',
    })
    this.page = await context.newPage()
    return this.page
  }

  getPage(): Page {
    if (!this.page) throw new Error('Browser not started')
    return this.page
  }

  async screenshot(): Promise<string> {
    const p = this.getPage()
    return (await p.screenshot({ type: 'png' })).toString('base64')
  }

  async content(): Promise<string> {
    return this.getPage().content()
  }

  async close(): Promise<void> {
    if (this.browser) await this.browser.close()
    this.browser = null
    this.page = null
  }
}
