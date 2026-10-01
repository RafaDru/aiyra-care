import { test, expect } from '@playwright/test'
import { requireQaTestCredentials } from '../helpers/env'
import { ensureQaE2eSession } from '../helpers/session'
import { qaPatientName, uniqueQaCpf } from '../helpers/fixtures'
import { createPatientFromDashboard, openPatientByName } from '../helpers/patient'

test.describe('patient-wallet', () => {
  test.beforeEach(() => {
    requireQaTestCredentials()
  })

  test('aba Carteira — sistema público e plano de saúde (smoke)', async ({ page }) => {
    const suffix = Date.now()
    const patientName = qaPatientName('carteira', suffix)

    await ensureQaE2eSession(page)

    await createPatientFromDashboard(page, {
      name: patientName,
      birthDate: '15/03/1990',
      genderLabel: 'Feminino',
      cpf: uniqueQaCpf(suffix),
    })

    await openPatientByName(page, patientName)
    const patientId = page.url().match(/\/patients\/([^?]+)/)?.[1]
    if (!patientId) throw new Error('ID do paciente não encontrado na URL')

    await page.goto(`/patients/${patientId}?section=plan&tab=wallet`)

    await expect(page.getByText(/Carteira de /)).toBeVisible({ timeout: 20_000 })
    await expect(page.getByText('Sistema público', { exact: true })).toBeVisible()
    await expect(page.locator('#wallet-card-conectesus')).toBeVisible()
    await expect(page.getByText('Plano de saúde', { exact: true })).toBeVisible()

    const emptyOrCard = page.getByText(/Nenhuma carteirinha|Nº da carteirinha/)
    await expect(emptyOrCard.first()).toBeVisible({ timeout: 10_000 })

    const todayPanel = page.locator('.wallet-today-panel')
    await expect(todayPanel.getByRole('heading', { name: 'Hoje' })).toBeVisible()
  })
})
