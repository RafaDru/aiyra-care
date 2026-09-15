import { test, expect } from '@playwright/test'
import { requireQaTestCredentials } from '../helpers/env'
import { ensureQaE2eSession } from '../helpers/session'
import { qaPatientName, uniqueQaCpf } from '../helpers/fixtures'
import { createPatientFromDashboard, openPatientByName } from '../helpers/patient'

test.describe('patient-health-thread', () => {
  test.beforeEach(() => {
    requireQaTestCredentials()
  })

  test('wizard cria investigação em acompanhamento', async ({ page }) => {
    const suffix = Date.now()
    const patientName = qaPatientName('thread', suffix)
    const investigationTitle = `QA-Investigação ${suffix}`

    await ensureQaE2eSession(page)

    await createPatientFromDashboard(page, {
      name: patientName,
      birthDate: '15/03/1990',
      genderLabel: 'Feminino',
      cpf: uniqueQaCpf(suffix),
    })

    await openPatientByName(page, patientName)

    const followUpCard = page.locator('.ant-card').filter({ hasText: 'Em acompanhamento' })
    await followUpCard.getByRole('button', { name: 'Adicionar' }).click()
    await page.getByRole('menuitem', { name: 'Investigação' }).click()

    const dialog = page.getByRole('dialog', { name: 'Nova investigação' })
    await dialog.waitFor({ state: 'visible' })

    await dialog.getByLabel('O que está sendo investigado?').fill(investigationTitle)
    await dialog.getByRole('button', { name: 'Continuar' }).click()
    await dialog.getByRole('button', { name: 'Continuar' }).click()
    await dialog.getByRole('button', { name: 'Continuar' }).click()
    await dialog.getByRole('button', { name: 'Abrir investigação' }).click()

    await expect(page.getByText(/Investigação aberta/i)).toBeVisible({ timeout: 20_000 })
    await expect(page.getByText(investigationTitle)).toBeVisible({ timeout: 10_000 })
  })
})
