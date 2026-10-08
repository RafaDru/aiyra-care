import { execSync } from 'child_process'
import { resolve } from 'path'
import { test, expect } from '@playwright/test'
import { requireOnboardingCredentials } from './helpers/env'
import { loginViaPassword } from './helpers/auth'
import { completeOnboardingProfile } from './helpers/onboarding'
import { uniqueQaCpf } from './helpers/fixtures'
import { waitForDashboardReady } from './helpers/dashboard'

const repoRoot = resolve(process.cwd(), '..', '..')

test.describe('onboarding', () => {
  test.beforeEach(() => {
    requireOnboardingCredentials()
  })

  test('login → perfil titular → dashboard', async ({ page }) => {
    execSync('npm run qa:reset-onboarding-user', { cwd: repoRoot, stdio: 'ignore' })
    const { email, password } = requireOnboardingCredentials()

    await loginViaPassword(page, email, password)
    await page.waitForURL(/\/(onboarding|$)/, { timeout: 30_000 })

    if (!page.url().includes('/onboarding')) {
      await page.goto('/onboarding')
    }

    await completeOnboardingProfile(page, {
      name: 'QA Onboarding Titular',
      birthDate: '15/03/1990',
      genderLabel: 'Masculino',
      cpf: uniqueQaCpf(),
    })

    await waitForDashboardReady(page)

    await expect(page.getByRole('heading', { name: 'QA Onboarding Titular' })).toBeVisible({
      timeout: 30_000,
    })

    const welcome = page.getByTestId('post-onboarding-welcome')
    await expect(welcome).toBeVisible({ timeout: 10_000 })
    await welcome.getByRole('button', { name: /Entendi|Got it/i }).click()

    await expect(page.getByTestId('first-visit-tour-drawer')).toBeVisible({ timeout: 10_000 })
  })

  test('Ver primeiros passos abre tour com tour_completed antigo no localStorage', async ({ page }) => {
    execSync('npm run qa:reset-onboarding-user', { cwd: repoRoot, stdio: 'ignore' })
    const { email, password } = requireOnboardingCredentials()

    await page.addInitScript(() => {
      localStorage.setItem('aiyracare.first_visit_tour_completed', '1')
    })

    await loginViaPassword(page, email, password)
    await page.waitForURL(/\/(onboarding|$)/, { timeout: 30_000 })

    if (!page.url().includes('/onboarding')) {
      await page.goto('/onboarding')
    }

    await completeOnboardingProfile(page, {
      name: 'QA Onboarding Tour CTA',
      birthDate: '15/03/1990',
      genderLabel: 'Masculino',
      cpf: uniqueQaCpf(),
    })

    await waitForDashboardReady(page)

    const welcome = page.getByTestId('post-onboarding-welcome')
    await expect(welcome).toBeVisible({ timeout: 10_000 })
    await page.evaluate(() => {
      localStorage.setItem('aiyracare.first_visit_tour_completed', '1')
    })
    await welcome.getByRole('button', { name: /primeiros passos|first steps/i }).click()

    await expect(page.getByTestId('first-visit-tour-drawer')).toBeVisible({ timeout: 10_000 })
  })
})
