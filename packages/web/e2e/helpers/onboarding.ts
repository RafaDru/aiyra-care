import { expect, type Page } from '@playwright/test'
import { clickAntSelectOption } from './select'

const COOKIE_CONSENT_VERSION = '1.0'

/** Evita banner de cookies e tour no meio do onboarding (CI headless). */
export async function primeE2eClientStorage(page: Page) {
  await page.addInitScript((version) => {
    localStorage.setItem('aiyracare_cookie_consent', version)
    localStorage.setItem('aiyracare.first_visit_tour_completed', '1')
    sessionStorage.removeItem('aiyracare.onboarding_wizard_step')
    sessionStorage.removeItem('aiyracare.onboarding_family_wizard')
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
  await input.click({ clickCount: 3 })
  await input.fill(value, { force: true })
  await input.press('Tab')
  await expect(input).toHaveValue(value, { timeout: 10_000 })
}

async function selectBrazilianState(page: Page, uf: string) {
  await clickAntSelectOption(page, page.getByTestId('onboarding-address-state'), uf)
}

async function skipConnectorSteps(page: Page) {
  for (const kind of ['sus', 'plans', 'labs', 'hospitals']) {
    const step = page.getByTestId(`onboarding-connector-${kind}`)
    await step.waitFor({ state: 'visible', timeout: 25_000 })
    await page.getByTestId(`onboarding-connector-skip-${kind}`).click()
  }
}

async function fillIdentityStep(page: Page, profile: OnboardingProfileInput) {
  await expect(async () => {
    const nameInput = page.getByTestId('onboarding-profile-name')
    await nameInput.click()
    await nameInput.fill(profile.name)
    await expect(nameInput).toHaveValue(profile.name)

    const birthInput = page.getByTestId('onboarding-profile-birthdate')
    await birthInput.click({ clickCount: 3 })
    await birthInput.fill(profile.birthDate, { force: true })
    await birthInput.press('Tab')
    await expect(birthInput).toHaveValue(profile.birthDate, { timeout: 5_000 })

    await clickAntSelectOption(page, page.getByTestId('onboarding-gender-select'), profile.genderLabel)
    await page.getByTestId('onboarding-profile-cpf').fill(profile.cpf)

    await page.getByTestId('onboarding-identity-continue').click()
    const cepVisible = await page.getByTestId('onboarding-address-cep').isVisible().catch(() => false)
    if (cepVisible) return
    const errors = await page.locator('.ant-form-item-explain-error').allTextContents()
    if (errors.length > 0) {
      throw new Error(`Identity validation: ${errors.join('; ')}`)
    }
    await expect(page.getByTestId('onboarding-address-cep')).toBeVisible({ timeout: 5_000 })
  }).toPass({ timeout: 60_000 })
}

async function fillAddressContactStep(page: Page) {
  await page.getByTestId('onboarding-address-cep').waitFor({ state: 'visible', timeout: 25_000 })
  await page.getByTestId('onboarding-address-cep').locator('input').fill('30130010')
  await page.getByTestId('onboarding-address-street').fill('Rua Teste Onboarding')
  await page.getByTestId('onboarding-address-number').fill('100')
  await page.getByLabel(/Bairro|Neighborhood/i).fill('Centro')
  await page.getByLabel(/^Cidade|City$/i).fill('Belo Horizonte')
  await selectBrazilianState(page, 'MG')
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
}

async function completeFamilyAndConnectors(page: Page) {
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

export async function completeOnboardingProfile(page: Page, profile: OnboardingProfileInput) {
  await dismissCookieBanner(page)

  const profileHeading = page.getByRole('heading', {
    name: /Vamos começar pelo seu perfil|Let's start with your profile/i,
  })
  const addressHeading = page.getByRole('heading', { name: /Onde você mora|Where you live/i })
  const familyName = page.getByTestId('onboarding-step-family-name')

  await Promise.race([
    profileHeading.waitFor({ state: 'visible', timeout: 25_000 }),
    addressHeading.waitFor({ state: 'visible', timeout: 25_000 }),
    familyName.waitFor({ state: 'visible', timeout: 25_000 }),
    page.getByTestId('onboarding-wizard-steps').waitFor({ state: 'visible', timeout: 25_000 }),
  ])

  const onIdentityForm = await page.getByTestId('onboarding-profile-name').isVisible().catch(() => false)

  if ((await profileHeading.isVisible().catch(() => false)) || onIdentityForm) {
    await fillIdentityStep(page, profile)
    await fillAddressContactStep(page)
  } else if (await addressHeading.isVisible().catch(() => false)) {
    await fillAddressContactStep(page)
  }

  if (!(await familyName.isVisible().catch(() => false))) {
    await familyName.waitFor({ state: 'visible', timeout: 25_000 })
  }

  await completeFamilyAndConnectors(page)
}
