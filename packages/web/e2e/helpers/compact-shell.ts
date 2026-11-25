import type { Page } from '@playwright/test'

/** Força detecção `useCompactAppShell` em Playwright (viewport estreito sem pointer coarse real). */
export async function emulateCompactAppShell(page: Page) {
  await page.addInitScript(() => {
    const orig = window.matchMedia.bind(window)
    window.matchMedia = (query: string): MediaQueryList => {
      if (query.includes('coarse') || query.includes('max-width: 768px') || query.includes('standalone')) {
        const stub = {
          matches: query.includes('standalone') ? false : true,
          media: query,
          onchange: null,
          addListener: () => {},
          removeListener: () => {},
          addEventListener: () => {},
          removeEventListener: () => {},
          dispatchEvent: () => true,
        }
        return stub as MediaQueryList
      }
      return orig(query)
    }
  })
}