import type { Browser } from 'playwright'

/** Browsers Playwright abertos por job de sync — fechar em timeout/erro. */
const byJobId = new Map<string, Browser>()

export function registerSyncBrowser(jobId: string, browser: Browser): void {
  byJobId.set(jobId, browser)
}

export async function unregisterSyncBrowser(jobId: string): Promise<void> {
  const browser = byJobId.get(jobId)
  if (!browser) return
  byJobId.delete(jobId)
  await browser.close().catch(() => {})
}
