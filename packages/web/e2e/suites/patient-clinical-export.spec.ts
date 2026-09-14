import { test, expect } from '@playwright/test'
import { requireQaTestCredentials } from '../helpers/env'
import { ensureQaE2eSession } from '../helpers/session'
import { qaPatientName, uniqueQaCpf } from '../helpers/fixtures'
import { createPatientFromDashboard, openPatientByName } from '../helpers/patient'

test.describe('patient-clinical-export', () => {
  test.beforeEach(() => {
    requireQaTestCredentials()
  })

  test('wizard Levar na consulta gera link copiável', async ({ page }) => {
    const suffix = Date.now()
    const patientName = qaPatientName('export', suffix)

    await ensureQaE2eSession(page)

    await createPatientFromDashboard(page, {
      name: patientName,
      birthDate: '15/03/1990',
      genderLabel: 'Feminino',
      cpf: uniqueQaCpf(suffix),
    })

    await openPatientByName(page, patientName)

    await page.getByRole('button', { name: 'Levar na consulta' }).click()
    const dialog = page.getByRole('dialog', { name: 'Levar na consulta' })
    await dialog.waitFor({ state: 'visible' })

    const copyButton = dialog.getByRole('button', { name: 'Copiar link' })
    await expect(copyButton).toBeEnabled({ timeout: 20_000 })
    await copyButton.click()

    await expect(page.getByText(/Link copiado/i)).toBeVisible({ timeout: 10_000 })
    await dialog.getByRole('button', { name: 'Fechar' }).click()
    await dialog.waitFor({ state: 'hidden' })
  })
})
