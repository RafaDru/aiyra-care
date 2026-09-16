import type { Page } from '@playwright/test'

/** Gate UI sempre ativo — aceita termos se redirecionado após login. */
export async function acceptComplianceIfPresent(page: Page) {
  if (!page.url().includes('/compliance/accept')) return

  await page.getByRole('heading', { name: 'Aceite dos termos' }).waitFor({ timeout: 20_000 })
  await page.getByRole('checkbox').check()
  await page.getByRole('button', { name: 'Li e aceito' }).click()
  await page.waitForURL((url) => !url.pathname.includes('/compliance/accept'), { timeout: 25_000 })
}
