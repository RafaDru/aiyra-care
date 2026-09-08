import { execSync } from 'child_process'
import { resolve } from 'path'
import type { Page } from '@playwright/test'
import { loginViaPassword } from './auth'
import { requireQaTestCredentials } from './env'
import { completeOnboardingProfile, dismissCookieBanner } from './onboarding'
import { uniqueQaCpf } from './fixtures'
import { hideAvaDock, dismissHygienePrompt } from './ui'

const repoRoot = resolve(process.cwd(), '..', '..')

export type EnsureSessionOptions = {
  keepHygienePrompt?: boolean
}

export async function ensureQaE2eSession(page: Page, opts?: EnsureSessionOptions) {
  execSync('npm run qa:seed-e2e-account', { cwd: repoRoot, stdio: 'ignore' })
  const { email, password } = requireQaTestCredentials()
  await loginViaPassword(page, email, password)
  await dismissCookieBanner(page)

  const novoPaciente = page.getByRole('button', { name: 'Novo Paciente' })
  const onboardingHeading = page.getByRole('heading', { name: 'Complete seu cadastro' })

  await Promise.race([
    novoPaciente.waitFor({ state: 'visible', timeout: 30_000 }),
    onboardingHeading.waitFor({ state: 'visible', timeout: 30_000 }),
  ])

  if (await onboardingHeading.isVisible()) {
    await completeOnboardingProfile(page, {
      name: 'QA E2E Titular',
      birthDate: '12/08/1987',
      genderLabel: 'Masculino',
      cpf: uniqueQaCpf(Date.now()),
    })
  }

  await novoPaciente.waitFor({ state: 'visible', timeout: 15_000 })
  await hideAvaDock(page)
  if (!opts?.keepHygienePrompt) {
    await dismissHygienePrompt(page)
  }
}
