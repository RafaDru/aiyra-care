import { test, expect } from '@playwright/test'
import { requireQaTestCredentials } from '../helpers/env'
import { ensureQaE2eSession } from '../helpers/session'
import { createQaPatientAndOpen, deleteCurrentPatient } from '../helpers/patient'
import { createMedication, deactivateMedication } from '../helpers/clinical'

test.describe('patient-medications-crud', () => {
  test.beforeEach(() => {
    requireQaTestCredentials()
  })

  test('criar e desativar medicamento', async ({ page }) => {
    const suffix = Date.now()
    const medName = `QA-Med-${suffix}`

    await ensureQaE2eSession(page)
    const { patientId } = await createQaPatientAndOpen(page, suffix)

    await createMedication(page, patientId, { genericName: medName, dosage: '500mg' })
    await deactivateMedication(page, medName)

    await deleteCurrentPatient(page)
  })
})
