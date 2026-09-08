import { execSync } from 'child_process'
import { resolve } from 'path'
import { test, expect } from '@playwright/test'
import { requireOnboardingCredentials } from './helpers/env'
import { loginViaPassword } from './helpers/auth'
import { completeOnboardingProfile } from './helpers/onboarding'
import { uniqueQaCpf } from './helpers/fixtures'

const repoRoot = resolve(process.cwd(), '..', '..')

test.describe('onboarding', () => {
  test.beforeEach(() => {
    requireOnboardingCredentials()
  })

  test('login → perfil titular → dashboard', async ({ page }) => {
    execSync('npm run qa:reset-onboarding-user', { cwd: repoRoot, stdio: 'ignore' })
    const { email, password } = requireOnboardingCredentials()

    await loginViaPassword(page, email, password)
    await page.waitForURL(/\/(onboarding|$)/, { timeout: 25_000 })

    if (!page.url().includes('/onboarding')) {
      await page.goto('/onboarding')
    }

    await completeOnboardingProfile(page, {
      name: 'QA Onboarding Titular',
      birthDate: '15/03/1990',
      genderLabel: 'Masculino',
      cpf: uniqueQaCpf(),
    })

    await expect(page.getByText('QA Onboarding Titular')).toBeVisible({ timeout: 15_000 })
  })
})
