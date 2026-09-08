import type { Page } from '@playwright/test'

type PatientTab =
  | 'exams'
  | 'medications'
  | 'documents'
  | 'integrations'
  | 'basic'

const TAB_ROUTE: Record<PatientTab, { section: string; tab: string }> = {
  basic: { section: 'overview', tab: 'basic' },
  exams: { section: 'clinical', tab: 'exams' },
  medications: { section: 'clinical', tab: 'medications' },
  documents: { section: 'files', tab: 'documents' },
  integrations: { section: 'plan', tab: 'integrations' },
}

const TAB_READY: Record<PatientTab, RegExp | string> = {
  basic: 'Dados básicos',
  exams: 'Novo Exame',
  medications: 'Nova Medicação',
  documents: 'Adicionar Arquivo',
  integrations: 'Nova integração',
}

export async function gotoPatientTab(page: Page, patientId: string, tab: PatientTab) {
  const { section, tab: tabKey } = TAB_ROUTE[tab]
  const query = tab === 'basic' ? '' : `?section=${section}&tab=${tabKey}`
  await page.goto(`/patients/${patientId}${query}`)
  await page.waitForURL(new RegExp(`/patients/${patientId}`), { timeout: 15_000 })

  const ready = TAB_READY[tab]
  if (ready instanceof RegExp) {
    await page.getByText(ready).first().waitFor({ state: 'visible', timeout: 20_000 })
  } else if (tab === 'basic') {
    await page.getByRole('tab', { name: ready }).waitFor({ state: 'visible', timeout: 20_000 })
  } else {
    await page.getByRole('button', { name: ready }).waitFor({ state: 'visible', timeout: 20_000 })
  }
}

export async function gotoFamilySettings(page: Page) {
  await page.goto('/settings/family')
  await page.waitForURL(/\/settings\/family/, { timeout: 15_000 })
}
