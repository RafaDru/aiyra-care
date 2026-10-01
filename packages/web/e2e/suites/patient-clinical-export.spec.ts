import { test, expect, type Page } from '@playwright/test'
import { requireQaTestCredentials } from '../helpers/env'
import { ensureQaE2eSession } from '../helpers/session'
import { qaPatientName, uniqueQaCpf } from '../helpers/fixtures'
import { createPatientFromDashboard, openPatientByName } from '../helpers/patient'

/** API may return PUBLIC_WEB_URL (e.g. :5173); Playwright preview uses another origin. */
function webShareUrl(page: Page, apiShareUrl: string): string {
  const { pathname, search } = new URL(apiShareUrl)
  return new URL(`${pathname}${search}`, page.url()).href
}

test.describe('patient-clinical-export', () => {
  test.beforeEach(() => {
    requireQaTestCredentials()
  })

  test('wizard Levar na consulta gera link copiável', async ({ page }) => {
    const suffix = Date.now()
    const patientName = qaPatientName('export', suffix)

    await ensureQaE2eSession(page)

    await createPatientFromDashboard(page, {
      name: patientName,
      birthDate: '15/03/1990',
      genderLabel: 'Feminino',
      cpf: uniqueQaCpf(suffix),
    })

    await openPatientByName(page, patientName)

    await page.getByRole('button', { name: 'Levar na consulta' }).click()
    const dialog = page.getByRole('dialog', { name: 'Levar na consulta' })
    await dialog.waitFor({ state: 'visible' })

    const copyButton = dialog.getByRole('button', { name: 'Copiar link' })
    await expect(copyButton).toBeEnabled({ timeout: 20_000 })
    await copyButton.click()

    await expect(page.locator('.ant-message').getByText(/Link copiado/i)).toBeVisible({ timeout: 10_000 })
    await dialog.getByRole('button', { name: 'Fechar' }).click()
    await dialog.waitFor({ state: 'hidden' })
  })

  test('wizard envia e-mail ao médico', async ({ page }) => {
    const suffix = Date.now()
    const patientName = qaPatientName('export-email', suffix)

    await ensureQaE2eSession(page)

    await createPatientFromDashboard(page, {
      name: patientName,
      birthDate: '15/03/1990',
      genderLabel: 'Feminino',
      cpf: uniqueQaCpf(suffix + 1),
    })

    await openPatientByName(page, patientName)

    await page.getByRole('button', { name: 'Levar na consulta' }).click()
    const dialog = page.getByRole('dialog', { name: 'Levar na consulta' })
    await dialog.waitFor({ state: 'visible' })

    await dialog.getByPlaceholder('medico@clinica.com.br').fill(`qa.medico.${suffix}@example.com`)
    await dialog.getByRole('button', { name: 'Enviar e-mail' }).click()

    await expect(
      page.getByText(/E-mail enviado ao médico|Link preparado/i),
    ).toBeVisible({ timeout: 20_000 })

    await dialog.getByRole('button', { name: 'Fechar' }).click()
    await dialog.waitFor({ state: 'hidden' })
  })

  test('link público abre portal do médico', async ({ page, context }) => {
    const suffix = Date.now()
    const patientName = qaPatientName('export-portal', suffix)
    let shareUrl: string | null = null

    page.on('response', async (response) => {
      if (!response.url().includes('/clinical-export/shares') || response.request().method() !== 'POST') return
      if (!response.ok()) return
      const body = await response.json().catch(() => null) as { shareUrl?: string } | null
      if (body?.shareUrl) shareUrl = body.shareUrl
    })

    await ensureQaE2eSession(page)

    await createPatientFromDashboard(page, {
      name: patientName,
      birthDate: '15/03/1990',
      genderLabel: 'Feminino',
      cpf: uniqueQaCpf(suffix + 2),
    })

    await openPatientByName(page, patientName)
    await page.getByRole('button', { name: 'Levar na consulta' }).click()
    const dialog = page.getByRole('dialog', { name: 'Levar na consulta' })
    await dialog.waitFor({ state: 'visible' })
    await expect(dialog.getByRole('button', { name: 'Copiar link' })).toBeEnabled({ timeout: 20_000 })

    await expect.poll(() => shareUrl, { timeout: 20_000 }).not.toBeNull()

    const publicPage = await context.newPage()
    await publicPage.goto(webShareUrl(page, shareUrl!))
    await expect(publicPage.getByText('Portal do médico')).toBeVisible({ timeout: 20_000 })
    await expect(publicPage.getByRole('heading', { name: patientName, level: 3 })).toBeVisible()
    await expect(publicPage.getByText(/Este resumo foi útil/i)).toBeVisible()
    await publicPage.close()
    await page.getByRole('dialog', { name: 'Levar na consulta' }).getByRole('button', { name: 'Fechar' }).click()
  })
})
