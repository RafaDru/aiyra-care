import { test, expect } from '@playwright/test'
import { MOCK_DEFECT_ID } from './fixtures/ch-cycle-close-api.js'
import { installChCycleCloseApiMocks } from './fixtures/install-ch-api-mocks.js'

test.describe('ops-ch-cycle-close (UI smoke, APIs mockadas)', () => {
  test.beforeEach(async ({ page }) => {
    await installChCycleCloseApiMocks(page)
  })

  test('Defeitos — badges CI/review e expand com ciclo + revisão agêntica', async ({ page }) => {
    await page.goto('/?group=operacao&tab=defeitos')

    await expect(page.getByText('DEF-000003')).toBeVisible()
    await expect(page.getByText('CI ✓')).toBeVisible()
    await expect(page.getByText('Aprovar merge')).toBeVisible()
    await expect(page.getByText('Aprovado p/ merge')).toBeVisible()

    await page.locator(`[data-defect-row-id="${MOCK_DEFECT_ID}"]`).click()

    await expect(page.getByText('Ciclo', { exact: true })).toBeVisible()
    await expect(page.getByText('Revisão agêntica')).toBeVisible()
    await expect(page.getByText('Eficácia:')).toBeVisible()
    await expect(page.getByText('Risco:')).toBeVisible()
    await expect(page.getByText('Segurança:')).toBeVisible()
    await expect(page.getByText('INC-000007')).toBeVisible()
  })

  test('Visão geral — card Ciclo CH (7d)', async ({ page }) => {
    await page.goto('/?group=operacao&tab=overview')

    await expect(page.getByText('Ciclo CH (7d)')).toBeVisible()
    await expect(page.getByText(/abertos/).first()).toBeVisible()
    await expect(page.getByText(/aguardando merge/)).toBeVisible()
    await expect(page.getByText(/tempo médio até fixed/)).toBeVisible()
  })
})
