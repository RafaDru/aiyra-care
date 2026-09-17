import type { Page } from '@playwright/test'
import { selectAntOption } from './select'

export async function dismissCookieBanner(page: Page) {
  const btn = page.getByRole('button', { name: 'Entendi' })
  if (await btn.isVisible().catch(() => false)) {
    await btn.click()
  }
}

export type OnboardingProfileInput = {
  name: string
  birthDate: string
  genderLabel: 'Masculino' | 'Feminino'
  cpf: string
}

async function fillMaskedDate(page: Page, label: string, value: string) {
  const input = page.getByLabel(label, { exact: false })
  await input.click()
  await input.fill(value)
  await input.press('Tab')
}

export async function completeOnboardingProfile(page: Page, profile: OnboardingProfileInput) {
  await page.getByRole('heading', { name: 'Bem-vindo ao AiyraCare' }).waitFor({ timeout: 25_000 })
  await dismissCookieBanner(page)
  await page.getByLabel('Nome completo').fill(profile.name)
  await fillMaskedDate(page, 'Data de nascimento', profile.birthDate)
  await selectAntOption(page, 'Sexo', profile.genderLabel)
  await page.getByLabel('CPF', { exact: true }).fill(profile.cpf)
  const profileSave = page.waitForResponse(
    (r) => r.url().includes('/auth/complete-profile') && r.request().method() === 'POST',
    { timeout: 35_000 },
  )
  await page.getByRole('button', { name: 'Continuar' }).click()
  await profileSave.catch(() => undefined)
  const leftOnboarding = await page
    .waitForURL((url) => !url.pathname.includes('/onboarding'), { timeout: 12_000 })
    .then(() => true)
    .catch(() => false)
  if (!leftOnboarding) {
    await page.getByRole('heading', { name: 'Quem você acompanha?' }).waitFor({ timeout: 35_000 })
    await page.getByRole('button', { name: 'Pular por agora' }).click()
    await page.waitForURL(/\//, { timeout: 25_000 })
  }
}
