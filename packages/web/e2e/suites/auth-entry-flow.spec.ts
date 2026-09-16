import { execSync } from 'child_process'
import { resolve } from 'path'
import { test, expect } from '@playwright/test'
import { requireOnboardingCredentials, requireQaTestCredentials } from '../helpers/env'
import { loginViaPassword } from '../helpers/auth'
import { completeOnboardingProfile } from '../helpers/onboarding'
import { ensureQaE2eSession } from '../helpers/session'
import { uniqueQaCpf } from '../helpers/fixtures'

const repoRoot = resolve(process.cwd(), '..', '..')

test.describe('auth-entry-flow', () => {
  test('cliente existente — landing → login → dashboard Sua família', async ({ page }) => {
    requireQaTestCredentials()
    await page.goto('/home')
    await page.getByRole('button', { name: 'Entrar' }).first().click()
    await expect(page).toHaveURL(/\/login\?mode=login/)
    await expect(page.getByText('Bem-vindo de volta')).toBeVisible()
    await ensureQaE2eSession(page)
    await expect(page.getByRole('heading', { name: 'Sua família' })).toBeVisible({ timeout: 30_000 })
  })

  test('novo cliente — landing → signup mode visível', async ({ page }) => {
    await page.goto('/home')
    await page.getByRole('button', { name: /Criar conta/i }).first().click()
    await expect(page).toHaveURL(/\/login\?mode=signup/)
    await expect(page.getByText('Crie sua conta')).toBeVisible()
    await expect(page.getByRole('button', { name: 'Criar conta' })).toBeVisible()
  })

  test('onboarding guiado — login QA onboarding → wizard → dashboard', async ({ page }) => {
    requireOnboardingCredentials()
    execSync('npm run qa:reset-onboarding-user', { cwd: repoRoot, stdio: 'ignore' })
    const { email, password } = requireOnboardingCredentials()

    await page.goto('/home')
    await page.getByRole('button', { name: 'Entrar' }).first().click()
    await loginViaPassword(page, email, password)
    await page.waitForURL(/\/(onboarding|compliance)/, { timeout: 30_000 })

    if (!page.url().includes('/onboarding')) {
      await page.goto('/onboarding')
    }

    await completeOnboardingProfile(page, {
      name: 'QA Onboarding Titular',
      birthDate: '15/03/1990',
      genderLabel: 'Masculino',
      cpf: uniqueQaCpf(),
    })

    await expect(page.getByRole('heading', { name: 'Sua família' })).toBeVisible({ timeout: 30_000 })
    await expect(page.getByText('QA Onboarding Titular')).toBeVisible()
  })
})
