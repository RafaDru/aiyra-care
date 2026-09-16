import type { Page } from '@playwright/test'
import { uniqueQaCpf } from './fixtures'
import { selectAntOption } from './select'
import { hideAvaDock } from './ui'

export type CreatePatientInput = {
  name: string
  birthDate: string
  genderLabel?: 'Masculino' | 'Feminino'
  cpf?: string
  minor?: boolean
}

async function fillMaskedDate(page: Page, label: string, value: string) {
  const input = page.getByLabel(label, { exact: false })
  await input.click()
  await input.fill(value)
  await input.press('Tab')
}

export async function openNewPatientModal(page: Page) {
  await page.getByRole('button', { name: 'Novo Paciente' }).click({ force: true })
  await page.getByRole('dialog').waitFor({ state: 'visible' })
}

export async function createPatientFromDashboard(page: Page, input: CreatePatientInput) {
  await openNewPatientModal(page)
  const dialog = page.getByRole('dialog')
  await dialog.getByLabel('Nome', { exact: true }).fill(input.name)
  await fillMaskedDate(page, 'Data de Nascimento', input.birthDate)
  if (input.genderLabel) {
    await selectAntOption(page, 'Sexo', input.genderLabel, dialog)
  }
  const cpf = input.cpf ?? uniqueQaCpf()
  await dialog.getByLabel('CPF', { exact: true }).fill(cpf)
  if (input.minor) {
    await dialog.locator('.ant-checkbox-wrapper').filter({ hasText: /responsável legal/i }).click()
  }
  await dialog.getByRole('button', { name: 'Salvar' }).click()
  await page.getByRole('dialog').waitFor({ state: 'hidden', timeout: 15_000 })
  await page.getByText(input.name).first().waitFor({ state: 'visible', timeout: 15_000 })
}

export async function openPatientByName(page: Page, name: string) {
  await page.getByText(name, { exact: true }).first().click()
  await page.waitForURL(/\/patients\//, { timeout: 15_000 })
  await page.getByRole('heading', { name, exact: true }).waitFor({ state: 'visible' })
}

export async function editPatientName(page: Page, newName: string) {
  await page.getByRole('button').filter({ has: page.locator('.anticon-edit') }).first().click()
  const dialog = page.getByRole('dialog', { name: 'Editar Dados do Paciente' })
  await dialog.waitFor({ state: 'visible' })
  await dialog.getByLabel('Nome', { exact: true }).fill(newName)
  await dialog.getByRole('button', { name: 'Salvar' }).click()
  await dialog.waitFor({ state: 'hidden' })
  await page.getByRole('heading', { name: newName }).waitFor({ state: 'visible' })
}

export async function deleteCurrentPatient(page: Page) {
  await hideAvaDock(page)
  const patientId = page.url().match(/\/patients\/([^?]+)/)?.[1]
  if (patientId && !page.url().includes('section=overview')) {
    await page.goto(`/patients/${patientId}?section=overview&tab=basic`)
    await page.getByRole('heading').first().waitFor({ state: 'visible', timeout: 10_000 })
  }
  await page.evaluate(() => window.scrollTo(0, 0))
  await page.locator('button.ant-btn-dangerous').filter({ has: page.locator('.anticon-delete') }).first().click({ force: true })
  const pop = page.locator('.ant-popconfirm')
  await pop.waitFor({ state: 'visible' })
  await pop.locator('.ant-btn-primary').click()
  await page.waitForURL(/\/$/, { timeout: 15_000 })
}

export async function createQaPatientAndOpen(page: Page, suffix: number) {
  const name = `QA-Clinico-${suffix}`
  await createPatientFromDashboard(page, {
    name,
    birthDate: '20/04/1992',
    genderLabel: 'Feminino',
    cpf: uniqueQaCpf(suffix),
  })
  await openPatientByName(page, name)
  const patientId = page.url().match(/\/patients\/([^?]+)/)?.[1]
  if (!patientId) throw new Error('ID do paciente não encontrado na URL')
  return { name, patientId }
}
