import { resolve } from 'path'
import type { Page } from '@playwright/test'
import { gotoPatientTab } from './navigation'
import { hideAvaDock } from './ui'

async function fillMaskedDate(page: Page, label: string, value: string) {
  const input = page.getByLabel(label, { exact: false })
  await input.click()
  await input.fill(value)
  await input.press('Tab')
}

export async function createManualExam(
  page: Page,
  patientId: string,
  input: { examType: string; examDate: string; resultSummary?: string },
) {
  await gotoPatientTab(page, patientId, 'exams')
  await page.getByRole('button', { name: 'Novo Exame' }).click()
  const dialog = page.getByRole('dialog', { name: 'Novo Exame' })
  await dialog.waitFor({ state: 'visible' })
  await dialog.getByLabel('Tipo de Exame').fill(input.examType)
  await fillMaskedDate(page, 'Data do Exame', input.examDate)
  if (input.resultSummary) {
    await dialog.getByLabel('Resumo do Resultado').fill(input.resultSummary)
  }
  await dialog.getByRole('button', { name: 'Salvar' }).click()
  await dialog.waitFor({ state: 'hidden', timeout: 15_000 })
  await page.getByText(input.examType).first().waitFor({ state: 'visible', timeout: 15_000 })
}

export async function createMedication(
  page: Page,
  patientId: string,
  input: { genericName: string; dosage?: string },
) {
  await gotoPatientTab(page, patientId, 'medications')
  await page.getByRole('button', { name: 'Nova Medicação' }).click()
  const dialog = page.getByRole('dialog', { name: 'Nova Medicação' })
  await dialog.waitFor({ state: 'visible' })
  await dialog.getByLabel('Nome Genérico').fill(input.genericName)
  if (input.dosage) {
    await dialog.getByLabel('Dosagem / valor').fill(input.dosage)
  }
  await dialog.getByRole('button', { name: 'Salvar' }).click()
  await dialog.waitFor({ state: 'hidden', timeout: 15_000 })
  await page.getByText(input.genericName).first().waitFor({ state: 'visible', timeout: 15_000 })
}

function medicationDialog(page: Page) {
  return page.getByRole('dialog', { name: /Editar|Nova Medicação/ })
}

export async function editMedicationName(page: Page, currentName: string, newName: string) {
  await hideAvaDock(page)
  const row = page.getByRole('row').filter({ hasText: currentName })
  await row.scrollIntoViewIfNeeded()
  await row.getByRole('button', { name: 'Editar' }).click({ force: true })
  const dialog = medicationDialog(page)
  await dialog.waitFor({ state: 'visible', timeout: 15_000 })
  await dialog.getByLabel('Nome Genérico').fill(newName)
  await dialog.getByRole('button', { name: 'Salvar' }).click()
  await dialog.waitFor({ state: 'hidden', timeout: 15_000 })
  await page.getByText(newName).first().waitFor({ state: 'visible', timeout: 15_000 })
}

export async function deactivateMedication(page: Page, name: string) {
  await hideAvaDock(page)
  const row = page.getByRole('row').filter({ hasText: name })
  await row.getByRole('button', { name: 'Editar' }).click({ force: true })
  const dialog = medicationDialog(page)
  await dialog.waitFor({ state: 'visible', timeout: 15_000 })
  await dialog.getByRole('switch').click()
  await dialog.getByRole('button', { name: 'Salvar' }).click()
  await dialog.waitFor({ state: 'hidden', timeout: 15_000 })
  await row.getByText('Não').waitFor({ state: 'visible', timeout: 10_000 })
}

const uploadFixture = resolve(process.cwd(), 'public/brands/amil-logo.png')
const uploadFileName = 'amil-logo.png'

export async function uploadClinicalDocument(page: Page, patientId: string) {
  await gotoPatientTab(page, patientId, 'documents')
  await page.getByRole('button', { name: 'Adicionar Arquivo' }).click()
  const dialog = page.getByRole('dialog', { name: 'Adicionar Arquivo' })
  await dialog.waitFor({ state: 'visible' })
  await dialog.locator('.ant-select').click()
  const option = page.locator('.ant-select-item-option').filter({ hasText: 'Outro' }).last()
  await option.waitFor({ state: 'attached', timeout: 15_000 })
  await option.click({ force: true })
  await dialog.locator('input[type="file"]').setInputFiles(uploadFixture)
  await dialog.getByRole('button', { name: 'Salvar' }).click()
  await dialog.waitFor({ state: 'hidden', timeout: 15_000 })

  const progress = page.getByRole('dialog').filter({ hasText: /upload|processando|continuar/i })
  const continueBtn = page.getByRole('button', { name: 'Continuar' })
  await continueBtn.waitFor({ state: 'visible', timeout: 60_000 })
  await continueBtn.click()

  const ocrReview = page.getByRole('dialog', { name: 'Revisão do OCR' })
  if (await ocrReview.isVisible({ timeout: 5_000 }).catch(() => false)) {
    await ocrReview.getByRole('button', { name: 'Confirmar e salvar' }).click()
    await ocrReview.waitFor({ state: 'hidden', timeout: 15_000 })
  }

  await page.locator('tr').filter({ hasText: uploadFileName }).first().waitFor({ state: 'visible', timeout: 30_000 })
  return uploadFileName
}

export async function deleteClinicalDocument(page: Page, fileName: string) {
  await hideAvaDock(page)
  const ocrReview = page.getByRole('dialog', { name: 'Revisão do OCR' })
  if (await ocrReview.isVisible({ timeout: 1_000 }).catch(() => false)) {
    await ocrReview.getByRole('button', { name: 'Fechar' }).click()
    await ocrReview.waitFor({ state: 'hidden', timeout: 10_000 })
  }
  const row = page.locator('tr').filter({ hasText: fileName })
  await row.scrollIntoViewIfNeeded()
  await row.getByRole('button', { name: 'Excluir arquivo' }).click()
  await page.getByText('Excluir este arquivo?').waitFor({ state: 'visible', timeout: 10_000 })
  await page.getByRole('button', { name: 'Excluir', exact: true }).click()
  await row.waitFor({ state: 'hidden', timeout: 15_000 })
}

export async function linkBradescoIntegration(page: Page, patientId: string, cpf: string) {
  await gotoPatientTab(page, patientId, 'integrations')
  await page.getByText(/Integrações de/).waitFor({ state: 'visible', timeout: 20_000 })
  await hideAvaDock(page)
  await page.getByRole('button', { name: 'Nova integração' }).click({ force: true })
  const picker = page.getByRole('dialog', { name: 'Nova integração' })
  await picker.waitFor({ state: 'visible' })
  await picker.getByPlaceholder('Buscar integração…').fill('Bradesco')
  await picker.getByText('Bradesco Saúde', { exact: true }).click()

  const linkDialog = page.getByRole('dialog', { name: /Vincular Bradesco Saúde/ })
  await linkDialog.waitFor({ state: 'visible' })
  await linkDialog.getByLabel(/CPF/).fill(cpf)
  await linkDialog.getByLabel('Senha').fill('qa-e2e-portal-pass')
  await linkDialog.getByRole('button', { name: 'Vincular' }).click()
  await linkDialog.waitFor({ state: 'hidden', timeout: 20_000 })
  await page.locator('tr').filter({ hasText: 'Bradesco Saúde' }).first().waitFor({ state: 'visible', timeout: 15_000 })
}

export async function removeIntegrationLink(page: Page, portalLabel: string) {
  await hideAvaDock(page)
  const row = page.locator('tr').filter({ hasText: portalLabel }).first()
  await row.getByRole('button').filter({ has: page.locator('.anticon-more') }).click({ force: true })
  await page.getByRole('menuitem', { name: 'Remover vínculo' }).click()
  await row.waitFor({ state: 'hidden', timeout: 15_000 })
}
