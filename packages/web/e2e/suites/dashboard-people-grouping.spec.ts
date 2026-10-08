import { test, expect } from '@playwright/test'
import { requireQaTestCredentials } from '../helpers/env'
import { ensureQaE2eSession } from '../helpers/session'

test.describe('dashboard-people-grouping', () => {
  test('Início — título e seletor de agrupamento', async ({ page }) => {
    requireQaTestCredentials()
    await ensureQaE2eSession(page)

    await expect(page.getByRole('heading', { name: 'Quem você cuida' })).toBeVisible({ timeout: 30_000 })
    await expect(page.getByTestId('dashboard-group-mode-toolbar')).toBeVisible()
    await expect(page.getByText('Por família')).toBeVisible()
    await expect(page.getByText('Por idade')).toBeVisible()
    await expect(page.getByText('A–Z')).toBeVisible()
  })
})
