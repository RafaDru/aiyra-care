import { test, expect } from '@playwright/test'
import { requireQaTestCredentials } from '../helpers/env'
import { ensureQaE2eSession } from '../helpers/session'
import { createQaPatientAndOpen, deleteCurrentPatient } from '../helpers/patient'
import { linkBradescoIntegration, removeIntegrationLink } from '../helpers/clinical'
import { uniqueQaCpf } from '../helpers/fixtures'

test.describe('integrations-link-sync', () => {
  test.beforeEach(() => {
    requireQaTestCredentials()
  })

  test('vincular e remover Bradesco Saúde (sem sync de portal)', async ({ page }) => {
    const suffix = Date.now()
    const cpf = uniqueQaCpf(suffix)

    await ensureQaE2eSession(page)
    const { patientId } = await createQaPatientAndOpen(page, suffix)

  await linkBradescoIntegration(page, patientId, cpf)
  await expect(page.locator('tr').filter({ hasText: 'Bradesco Saúde' }).first()).toContainText('Vínculo manual')

    await removeIntegrationLink(page, 'Bradesco Saúde')

    await deleteCurrentPatient(page)
  })
})
