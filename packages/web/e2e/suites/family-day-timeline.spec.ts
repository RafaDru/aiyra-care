import { test, expect } from '@playwright/test'
import { requireQaTestCredentials } from '../helpers/env'
import { ensureQaE2eSession } from '../helpers/session'
import { qaPatientName, uniqueQaCpf } from '../helpers/fixtures'
import { createPatientFromDashboard, openPatientByName } from '../helpers/patient'

test.describe('family-day-timeline', () => {
  test.beforeEach(() => {
    requireQaTestCredentials()
  })

  test('bloco Hoje na Carteira com atalho de captura', async ({ page }) => {
    const suffix = Date.now()
    const patientName = qaPatientName('hoje', suffix)

    await ensureQaE2eSession(page)

    await createPatientFromDashboard(page, {
      name: patientName,
      birthDate: '15/03/1990',
      genderLabel: 'Feminino',
      cpf: uniqueQaCpf(suffix),
    })

    await openPatientByName(page, patientName)
    const planSection = page
      .locator('.patient-section-nav .ant-segmented-item-label')
      .filter({ hasText: 'Plano & portais' })
    await planSection.scrollIntoViewIfNeeded()
    await planSection.click()
    await page.getByRole('tab', { name: 'Carteira' }).click()

    const todayCard = page.locator('.wallet-today-panel')
    await expect(todayCard.getByText('Hoje', { exact: true })).toBeVisible()
    await todayCard.getByRole('button', { name: 'Registro rápido' }).click()

    const drawer = page.getByRole('dialog', { name: 'Registro rápido' })
    await drawer.waitFor({ state: 'visible' })
    await drawer.getByRole('button', { name: 'Cancelar' }).click()
    await drawer.waitFor({ state: 'hidden' })
  })

  test('bloco Hoje visível no dashboard', async ({ page }) => {
    await ensureQaE2eSession(page)

    const todayCard = page.locator('.wallet-today-panel').first()
    await expect(todayCard.getByText('Hoje', { exact: true })).toBeVisible({ timeout: 15_000 })
    await expect(todayCard.getByRole('button', { name: 'Registro rápido' })).toBeVisible()
  })
})
