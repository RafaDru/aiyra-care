import { test, expect } from '@playwright/test'
import { requireQaTestCredentials } from '../helpers/env'
import { ensureQaE2eSession } from '../helpers/session'
import { createQaPatientAndOpen, deleteCurrentPatient } from '../helpers/patient'
import { createManualExam } from '../helpers/clinical'

test.describe('patient-exams-crud', () => {
  test.beforeEach(() => {
    requireQaTestCredentials()
  })

  test('criar exame manual na aba Exames', async ({ page }) => {
    const suffix = Date.now()
    const examType = `QA-Exame-${suffix}`

    await ensureQaE2eSession(page)
    const { patientId } = await createQaPatientAndOpen(page, suffix)

    await createManualExam(page, patientId, {
      examType,
      examDate: '08/09/2026',
      resultSummary: 'Hemoglobina 14.2',
    })

    await expect(page.getByText(examType).first()).toBeVisible()

    await deleteCurrentPatient(page)
  })
})
