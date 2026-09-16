import type { Page } from '@playwright/test'
import { acceptComplianceIfPresent } from './compliance'

export async function loginViaPassword(page: Page, email: string, password: string) {
  const timeout = process.env.CI ? 40_000 : 25_000

  await page.goto('/login')
  await page.getByLabel('E-mail').fill(email)
  await page.getByLabel('Senha').fill(password)
  await page.getByRole('button', { name: 'Entrar' }).click()

  try {
    await page.waitForURL((url) => !url.pathname.includes('/login'), { timeout })
  } catch {
    const alertText = await page.locator('.ant-alert-error').first().textContent().catch(() => '')
    throw new Error(
      `Login não saiu de /login (${email}). Alerta: ${alertText?.trim() || '(nenhum)'}`,
    )
  }

  await acceptComplianceIfPresent(page)
}
