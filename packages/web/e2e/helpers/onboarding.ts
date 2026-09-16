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
  await page.getByRole('heading', { name: 'Complete seu cadastro' }).waitFor({ timeout: 25_000 })
  await dismissCookieBanner(page)
  await page.getByLabel('Nome completo').fill(profile.name)
  await fillMaskedDate(page, 'Data de nascimento', profile.birthDate)
  await selectAntOption(page, 'Sexo', profile.genderLabel)
  await page.getByLabel('CPF', { exact: true }).fill(profile.cpf)
  await page.getByRole('button', { name: 'Concluir cadastro' }).click()
  await page.waitForURL(/\/$/, { timeout: 25_000 })
}
