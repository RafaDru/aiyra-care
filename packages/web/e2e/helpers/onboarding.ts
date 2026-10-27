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
    sessionStorage.removeItem('aiyracare.onboarding_just_completed')
    sessionStorage.removeItem('aiyracare.onboarding_wizard_owner_sub')
  }, COOKIE_CONSENT_VERSION)
}

/** AuthContext `loading` esconde o wizard — não usar Promise.race em waitFor (rejeição precoce). */
export async function waitForOnboardingWizardReady(page: Page, timeout = 60_000) {
  const profileHeading = page.getByRole('heading', {
    name: /Vamos começar pelo seu perfil|Let's start with your profile/i,
  })
  const addressHeading = page.getByRole('heading', { name: /Onde você mora|Where you live/i })
  const wizardSteps = page.getByTestId('onboarding-wizard-steps')
  const profileName = page.getByTestId('onboarding-profile-name')
  const familyName = page.getByTestId('onboarding-step-family-name')
  const familyMembers = page.getByTestId('onboarding-step-family-members')
  const avaSummary = page.getByTestId('onboarding-step-ava-summary')
  const addressCep = page.getByTestId('onboarding-address-cep')

  await expect(async () => {
    const ready =
      (await profileHeading.isVisible().catch(() => false)) ||
      (await addressHeading.isVisible().catch(() => false)) ||
      (await wizardSteps.isVisible().catch(() => false)) ||
      (await profileName.isVisible().catch(() => false)) ||
      (await familyName.isVisible().catch(() => false)) ||
      (await familyMembers.isVisible().catch(() => false)) ||
      (await avaSummary.isVisible().catch(() => false)) ||
      (await addressCep.isVisible().catch(() => false))
    expect(ready).toBe(true)
  }).toPass({ timeout })
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
  await expect(async () => {
    const trigger = page
      .getByTestId('onboarding-address-state')
      .or(page.getByRole('combobox', { name: /Estado|State/i }))
    await trigger.click()
    await page.keyboard.type(uf, { delay: 40 })
    await page.keyboard.press('Enter')
    await expect(trigger).toContainText(uf, { timeout: 5_000 })
  }).toPass({ timeout: 25_000 })
}

async function completeAvaSummaryStep(page: Page) {
  const summary = page.getByTestId('onboarding-step-ava-summary')
  await summary.waitFor({ state: 'visible', timeout: 25_000 })
  await page.getByTestId('onboarding-ava-summary-skip').click()
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
  const cepField = page.getByTestId('onboarding-address-cep')
  await cepField.locator('input').first().fill('30130-010')
  await page.getByTestId('onboarding-address-street').fill('Rua Teste Onboarding')
  await page.getByTestId('onboarding-address-number').fill('100')
  await page.getByTestId('onboarding-address-district').fill('Centro')
  await page.getByTestId('onboarding-address-city').fill('Belo Horizonte')
  await selectBrazilianState(page, 'MG')
  await page.getByTestId('onboarding-contact-mobile').fill('31999998888')

  const submit = page.getByTestId('onboarding-profile-submit')
  await expect(submit).toBeEnabled({ timeout: 5_000 })

  const profileSave = page.waitForResponse(
    (r) => r.url().includes('/auth/complete-profile') && r.request().method() === 'POST',
    { timeout: 35_000 },
  )
  await submit.click()
  const saveResponse = await profileSave
  if (!saveResponse.ok()) {
    const body = await saveResponse.text().catch(() => '')
    throw new Error(`complete-profile HTTP ${saveResponse.status()}: ${body.slice(0, 240)}`)
  }
}

async function waitForFamilyStepOrMembers(page: Page) {
  const familyName = page.getByTestId('onboarding-step-family-name')
  const familyMembers = page.getByTestId('onboarding-step-family-members')
  await expect(async () => {
    const visible =
      (await familyName.isVisible().catch(() => false)) ||
      (await familyMembers.isVisible().catch(() => false))
    expect(visible).toBe(true)
  }).toPass({ timeout: 60_000 })
}

async function completeFamilyAndConnectors(page: Page) {
  await waitForFamilyStepOrMembers(page)

  const familyMembers = page.getByTestId('onboarding-step-family-members')
  if (!(await familyMembers.isVisible().catch(() => false))) {
    const familyNameStep = page.getByTestId('onboarding-step-family-name')
    const familyNameInput = familyNameStep.getByLabel(/Nome da família|Family name/i)
    await expect(familyNameInput).not.toHaveValue('', { timeout: 20_000 })
    if (!(await familyNameInput.inputValue()).trim()) {
      await familyNameInput.fill('Família QA E2E')
    }

    await expect(async () => {
      if (await familyMembers.isVisible().catch(() => false)) return

      const circleCreate = page.waitForResponse(
        (r) => r.url().includes('/care-circles') && r.request().method() === 'POST',
        { timeout: 45_000 },
      )
      const continueBtn = familyNameStep.getByRole('button', { name: /Continuar|Continue/i })
      await expect(continueBtn).toBeEnabled({ timeout: 5_000 })
      await continueBtn.click()
      const circleResponse = await circleCreate
      if (!circleResponse.ok()) {
        const body = await circleResponse.text().catch(() => '')
        throw new Error(`care-circles HTTP ${circleResponse.status()}: ${body.slice(0, 240)}`)
      }
      await expect(familyMembers).toBeVisible({ timeout: 15_000 })
    }).toPass({ timeout: 90_000 })
  }

  await page.getByRole('button', { name: /Pular pessoas por agora|Skip people for now/i }).click()

  await completeAvaSummaryStep(page)

  await page.waitForURL((url) => !url.pathname.includes('/onboarding'), { timeout: 45_000 })
}

export async function completeOnboardingProfile(page: Page, profile: OnboardingProfileInput) {
  await dismissCookieBanner(page)
  await waitForOnboardingWizardReady(page)

  const profileHeading = page.getByRole('heading', {
    name: /Vamos começar pelo seu perfil|Let's start with your profile/i,
  })
  const addressHeading = page.getByRole('heading', { name: /Onde você mora|Where you live/i })

  const onIdentityForm = await page.getByTestId('onboarding-profile-name').isVisible().catch(() => false)

  if ((await profileHeading.isVisible().catch(() => false)) || onIdentityForm) {
    await fillIdentityStep(page, profile)
    await fillAddressContactStep(page)
    await waitForFamilyStepOrMembers(page)
  } else if (await addressHeading.isVisible().catch(() => false)) {
    await fillAddressContactStep(page)
    await waitForFamilyStepOrMembers(page)
  }

  await completeFamilyAndConnectors(page)
}
