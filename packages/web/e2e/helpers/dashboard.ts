import type { Page } from '@playwright/test'

/** CTA primário no PageHeader — distinto do link no Empty e do onboarding passo 2. */
export function dashboardAddFamilyButton(page: Page) {
  return page.locator('.ant-page-header').getByRole('button', { name: 'Adicionar à família' })
}

export async function waitForDashboardReady(page: Page) {
  await page.waitForURL(/\/($|\?)/, { timeout: 30_000 })
  await page.locator('.ant-spin').first().waitFor({ state: 'hidden', timeout: 30_000 }).catch(() => undefined)
  await dashboardAddFamilyButton(page).waitFor({ state: 'visible', timeout: 30_000 })
}
