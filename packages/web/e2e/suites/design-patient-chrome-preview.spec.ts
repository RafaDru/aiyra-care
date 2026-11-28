import { test, expect } from '@playwright/test'
import { emulateCompactAppShell } from '../helpers/compact-shell'

test.describe('design-patient-chrome-preview', () => {
  test.use({ viewport: { width: 390, height: 844 } })

  test.beforeEach(async ({ page }) => {
    await emulateCompactAppShell(page)
  })

  test('bottom nav visível na galeria PAT', async ({ page }) => {
    test.skip(!process.env.VITE_DESIGN_ROUTES && process.env.CI, 'design routes off em CI')

    await page.goto('/design/patient-chrome?chrome=auto')
    await expect(page.getByTestId('app-mobile-bottom-nav')).toBeVisible({ timeout: 15_000 })
    await expect(page.getByTestId('design-patient-chrome-rail')).toBeVisible()
  })
})