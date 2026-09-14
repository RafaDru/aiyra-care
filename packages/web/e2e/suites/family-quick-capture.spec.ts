import { test, expect } from '@playwright/test'
import { requireQaTestCredentials } from '../helpers/env'
import { ensureQaE2eSession } from '../helpers/session'

test.describe('family-quick-capture', () => {
  test.beforeEach(() => {
    requireQaTestCredentials()
  })

  test('registro rápido salva nota pelo header', async ({ page }) => {
    await ensureQaE2eSession(page)

    await page.getByRole('button', { name: 'Registro rápido' }).click()
    const drawer = page.getByRole('dialog', { name: 'Registro rápido' })
    await drawer.waitFor({ state: 'visible' })

    await drawer.getByLabel('Sintoma ou nota').fill('QA E2E — febre leve registrada via captura rápida')
    await drawer.getByRole('button', { name: 'Salvar' }).click()

    await expect(page.getByText(/Registro salvo/i)).toBeVisible({ timeout: 15_000 })
    await drawer.waitFor({ state: 'hidden', timeout: 10_000 })
  })
})
