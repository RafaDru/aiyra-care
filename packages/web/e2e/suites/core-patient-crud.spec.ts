import { test, expect } from '@playwright/test'
import { requireQaTestCredentials } from '../helpers/env'
import { ensureQaE2eSession } from '../helpers/session'
import { qaPatientName, uniqueQaCpf } from '../helpers/fixtures'
import {
  createPatientFromDashboard,
  openPatientByName,
  editPatientName,
  deleteCurrentPatient,
} from '../helpers/patient'

test.describe('core-patient-crud', () => {
  test.beforeEach(() => {
    requireQaTestCredentials()
  })

  test('CRUD paciente adulto e menor via UI', async ({ page }) => {
    const suffix = Date.now()
    const adultName = qaPatientName('adult', suffix)
    const adultEdited = `${adultName}-editado`
    const minorName = qaPatientName('minor', suffix)

    await ensureQaE2eSession(page)

    await createPatientFromDashboard(page, {
      name: adultName,
      birthDate: '10/05/1985',
      genderLabel: 'Masculino',
      cpf: uniqueQaCpf(suffix),
    })

    await openPatientByName(page, adultName)
    await page.getByText(/Visão geral|Carteira|Exames/i).first().waitFor({ state: 'visible' })

    await page.getByRole('button', { name: 'Voltar' }).click()
    await page.waitForURL(/\/$/, { timeout: 15_000 })

    await createPatientFromDashboard(page, {
      name: minorName,
      birthDate: '01/06/2020',
      genderLabel: 'Feminino',
      cpf: uniqueQaCpf(suffix + 1),
      minor: true,
    })

    await openPatientByName(page, adultName)
    await editPatientName(page, adultEdited)
    await page.getByRole('button', { name: 'Voltar' }).click()

    await openPatientByName(page, minorName)
    await deleteCurrentPatient(page)
    await expect(page.getByText(minorName)).toHaveCount(0)

    await openPatientByName(page, adultEdited)
    await deleteCurrentPatient(page)
    await expect(page.getByText(adultEdited)).toHaveCount(0)
    await expect(page.getByText(/^QA-/)).toHaveCount(0)
  })
})
