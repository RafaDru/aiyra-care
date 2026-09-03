import { test, expect } from '@playwright/test'

test.describe('smoke', () => {
  test('login page renders', async ({ page }) => {
    await page.goto('/login')
    await expect(page).toHaveURL(/\/login/)
    await expect(page.locator('body')).toContainText(/entrar|login|Aiyra/i)
  })

  test('landing page renders', async ({ page }) => {
    await page.goto('/home')
    await expect(page.locator('body')).toBeVisible()
  })
})
