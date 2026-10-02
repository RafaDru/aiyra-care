import { test, expect } from '@playwright/test'
import { requireQaTestCredentials } from '../helpers/env'
import { ensureQaE2eSession } from '../helpers/session'

test.describe('support-user-report', () => {
  test.beforeEach(() => {
    requireQaTestCredentials()
  })

  test('enviar relatório de problema pelo menu', async ({ page }) => {
    await page.route('**/telemetry/client-errors', async (route) => {
      if (route.request().method() !== 'POST') {
        await route.continue()
        return
      }
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ accepted: 1, rejected: 0 }),
      })
    })

    await ensureQaE2eSession(page)

    await page.getByRole('button', { name: 'Reportar problema' }).click()
    const dialog = page.getByRole('dialog', { name: 'Reportar um problema' })
    await dialog.waitFor({ state: 'visible' })

    await expect(dialog.getByText(/Incluir contexto técnico/i)).toBeVisible()
    await dialog.getByLabel('O que aconteceu? (opcional)').fill('QA E2E — teste automatizado de suporte')

    const submitResponse = page.waitForResponse(
      (res) =>
        res.url().includes('/support/reports') &&
        res.request().method() === 'POST',
      { timeout: 20_000 },
    )

    await dialog.getByRole('button', { name: 'Enviar relatório' }).click()

    const response = await submitResponse
    const body = await response.text().catch(() => '')
    expect(response.status(), body.slice(0, 240)).toBe(201)

    await expect(page.getByText(/Relatório enviado/i)).toBeVisible({ timeout: 15_000 })
    await dialog.waitFor({ state: 'hidden', timeout: 10_000 })
  })
})
