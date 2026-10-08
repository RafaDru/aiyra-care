import { expect, type Page } from '@playwright/test'
import { clickAntSelectOption, selectAntOption } from './select'

const COOKIE_CONSENT_VERSION = '1.0'

/** Evita banner de cookies e tour no meio do onboarding (CI headless). */
export async function primeE2eClientStorage(page: Page) {
  await page.addInitScript((version) => {
    localStorage.setItem('aiyracare_cookie_consent', version)
    localStorage.setItem('aiyracare.first_visit_tour_completed', '1')
  }, COOKIE_CONSENT_VERSION)
}

export async function dismissCookieBanner(page: Page) {
  const btn = page.getByRole('button', { name: /Entendi|I understand/i })
  if (!(await btn.isVisible().catch(() => false))) return
  await expect(btn).not.toHaveClass(/ant-btn-loading/, { timeout: 15_000 }).catch(() => undefined)
  await btn.click({ force: true, timeout: 10_000 }).catch(() => undefined)
}

export type OnboardingProfileInput = {
  name: string
  birthDate: string
  genderLabel: 'Masculino' | 'Feminino'
  cpf: string
}

async function fillMaskedDate(page: Page, label: RegExp, value: string) {
  const input = page.getByLabel(label, { exact: false })
  await input.fill(value, { force: true })
  await input.press('Tab')
}

async function skipConnectorSteps(page: Page) {
  for (const kind of ['sus', 'plans', 'labs', 'hospitals']) {
    const step = page.getByTestId(`onboarding-connector-${kind}`)
    await step.waitFor({ state: 'visible', timeout: 25_000 })
    await page.getByTestId(`onboarding-connector-skip-${kind}`).click()
  }
}

export async function completeOnboardingProfile(page: Page, profile: OnboardingProfileInput) {
  await page
    .getByRole('heading', { name: /Vamos começar pelo seu perfil|Let's start with your profile/i })
    .waitFor({ timeout: 25_000 })
  await dismissCookieBanner(page)

  const nameInput = page.getByRole('textbox', { name: /Nome completo|Full name/i })
  await expect(async () => {
    await nameInput.click()
    await nameInput.fill(profile.name)
    await expect(nameInput).toHaveValue(profile.name)
  }).toPass({ timeout: 15_000 })

  await fillMaskedDate(page, /Data de nascimento|Date of birth/i, profile.birthDate)
  await clickAntSelectOption(page, page.getByTestId('onboarding-gender-select'), profile.genderLabel)
  await page.getByRole('textbox', { name: /^CPF$/i }).fill(profile.cpf)

  await expect(async () => {
    await page.getByTestId('onboarding-identity-continue').click()
    await expect(page.getByTestId('onboarding-address-cep')).toBeVisible({ timeout: 8_000 })
  }).toPass({ timeout: 30_000 })
  await page.getByTestId('onboarding-address-cep').locator('input').fill('30130010')
  await page.getByTestId('onboarding-address-street').fill('Rua Teste Onboarding')
  await page.getByTestId('onboarding-address-number').fill('100')
  await page.getByLabel(/Bairro|Neighborhood/i).fill('Centro')
  await page.getByLabel(/^Cidade|City$/i).fill('Belo Horizonte')
  await clickAntSelectOption(page, page.getByTestId('onboarding-address-state'), 'MG')
  await page.getByTestId('onboarding-contact-mobile').fill('31999998888')

  const profileSave = page.waitForResponse(
    (r) => r.url().includes('/auth/complete-profile') && r.request().method() === 'POST',
    { timeout: 35_000 },
  )
  await page.getByTestId('onboarding-profile-submit').click()
  const saveResponse = await profileSave
  if (!saveResponse.ok()) {
    const body = await saveResponse.text().catch(() => '')
    throw new Error(`complete-profile HTTP ${saveResponse.status()}: ${body.slice(0, 240)}`)
  }

  await page.getByTestId('onboarding-step-family-name').waitFor({ state: 'visible', timeout: 25_000 })

  const circleCreate = page.waitForResponse(
    (r) => r.url().includes('/care-circles') && r.request().method() === 'POST',
    { timeout: 35_000 },
  )
  await page.getByRole('button', { name: /Continuar|Continue/i }).click()
  const circleResponse = await circleCreate
  if (!circleResponse.ok()) {
    const body = await circleResponse.text().catch(() => '')
    throw new Error(`care-circles HTTP ${circleResponse.status()}: ${body.slice(0, 240)}`)
  }

  await page.getByTestId('onboarding-step-family-members').waitFor({ state: 'visible', timeout: 25_000 })
  await page.getByRole('button', { name: /Pular pessoas por agora|Skip people for now/i }).click()

  await skipConnectorSteps(page)

  await page.waitForURL((url) => !url.pathname.includes('/onboarding'), { timeout: 25_000 })
}
