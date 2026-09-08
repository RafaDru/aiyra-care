import { test, expect } from '@playwright/test'
import { requireQaTestCredentials } from '../helpers/env'
import { ensureQaE2eSession } from '../helpers/session'
import { createQaPatientAndOpen, deleteCurrentPatient } from '../helpers/patient'
import { uploadClinicalDocument, deleteClinicalDocument } from '../helpers/clinical'

test.describe('patient-documents-crud', () => {
  test.beforeEach(() => {
    requireQaTestCredentials()
  })

  test('upload e exclusão de arquivo clínico', async ({ page }) => {
    const suffix = Date.now()

    await ensureQaE2eSession(page)
    const { patientId } = await createQaPatientAndOpen(page, suffix)

    const fileName = await uploadClinicalDocument(page, patientId)

    await deleteClinicalDocument(page, fileName)

    await deleteCurrentPatient(page)
  })
})
