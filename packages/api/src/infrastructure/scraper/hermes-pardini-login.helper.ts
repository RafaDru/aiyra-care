import type { Page } from 'playwright'
import { hermesPardiniPortalEntryUrl } from './hermes-pardini.portal.js'
import { formatHermesPardiniUsername } from './hermes-pardini-auth.js'

export interface CapturedOidcTokens {
  accessToken: string
  refreshToken: string
}

/** Modal de segurança no portal Precision Care / Keycloak. */
export async function dismissHermesPardiniSecurityModal(page: Page): Promise<void> {
  const removed = await page.evaluate(() => {
    const modal = document.getElementById('modal-welcome')
    if (modal) {
      modal.remove()
      return true
    }
    return false
  })
  if (removed) await page.waitForTimeout(300)

  const okBtn = page.getByRole('button', { name: /ok,\s*entendi/i })
  if (await okBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
    await okBtn.click({ timeout: 5000 }).catch(() => {})
    await page.waitForTimeout(500)
  }
}

export async function openHermesPardiniPortalLogin(page: Page): Promise<void> {
  await page.goto(hermesPardiniPortalEntryUrl(), { waitUntil: 'domcontentloaded', timeout: 60_000 })
  await dismissHermesPardiniSecurityModal(page)
  await page.waitForURL(/grupofleury\.com\.br/, { timeout: 30_000 })
}

/** Garante formulário usuário/senha (não CPF+data de nascimento). */
export async function ensureHermesPardiniPasswordLoginForm(page: Page): Promise<void> {
  await dismissHermesPardiniSecurityModal(page)

  const username = page.locator('#_username, input[name="username"]')
  if (await username.isVisible({ timeout: 3000 }).catch(() => false)) return

  const passwordToggle = page.getByRole('button', { name: /^entrar com senha$/i })
  if (await passwordToggle.isVisible({ timeout: 5000 }).catch(() => false)) {
    await passwordToggle.click()
    await page.waitForTimeout(800)
  }

  // Keycloak mantém ambos os formulários no DOM; campos podem existir mas hidden.
  const visible = await username.isVisible({ timeout: 3000 }).catch(() => false)
  if (!visible) {
    await page.evaluate(() => {
      const formName = document.getElementById('_login-type') as HTMLInputElement | null
      if (formName) formName.value = 'password'
      const cpf = document.getElementById('_cpf') as HTMLElement | null
      const birth = document.getElementById('_birthdate') as HTMLElement | null
      const userWrap = document.getElementById('_username')?.closest('.mdc-text-field') as HTMLElement | null
      const pwdWrap = document.getElementById('_password')?.closest('.mdc-text-field') as HTMLElement | null
      if (cpf?.closest('.mdc-text-field')) (cpf.closest('.mdc-text-field') as HTMLElement).style.display = 'none'
      if (birth?.closest('.mdc-text-field')) (birth.closest('.mdc-text-field') as HTMLElement).style.display = 'none'
      if (userWrap) userWrap.style.display = ''
      if (pwdWrap) pwdWrap.style.display = ''
    })
  }

  await username.waitFor({ state: 'attached', timeout: 20_000 })
}

export async function fillHermesPardiniPasswordForm(
  page: Page,
  login: string,
  password: string,
): Promise<void> {
  await ensureHermesPardiniPasswordLoginForm(page)
  const username = page.locator('#_username, input[name="username"]')
  const pwd = page.locator('#_password, input[name="password"]')
  await username.waitFor({ state: 'attached', timeout: 20_000 })
  await username.fill(formatHermesPardiniUsername(login), { force: true })
  await pwd.fill(password, { force: true })
}

export async function submitHermesPardiniPasswordForm(page: Page): Promise<void> {
  await dismissHermesPardiniSecurityModal(page)
  const passwordBtn = page.locator(
    'button[id="_prosseguir-button-password"], button#_prosseguir-button:not(#_prosseguir-button-birthdate), #kc-form-login button[type="submit"]',
  ).first()
  if (await passwordBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
    await passwordBtn.click({ timeout: 10_000 })
    return
  }
  await page.locator('#kc-form-login').evaluate((form) => {
    ;(form as HTMLFormElement).requestSubmit()
  })
}

export function attachHermesPardiniTokenCapture(page: Page): {
  waitForTokens: (timeoutMs?: number) => Promise<CapturedOidcTokens>
} {
  let captured: CapturedOidcTokens | null = null

  page.on('response', async (response) => {
    if (!response.url().includes('/openid-connect/token')) return
    if (response.status() < 200 || response.status() >= 300) return
    try {
      const json = await response.json() as { access_token?: string; refresh_token?: string }
      if (json.access_token) {
        captured = {
          accessToken: json.access_token,
          refreshToken: json.refresh_token ?? '',
        }
      }
    } catch { /* ignore */ }
  })

  return {
    waitForTokens: async (timeoutMs = 90_000) => {
      const deadline = Date.now() + timeoutMs
      while (Date.now() < deadline) {
        if (captured) return captured
        await page.waitForTimeout(400)
      }
      throw new Error('Token OIDC Hermes Pardini não capturado após login no browser')
    },
  }
}

/**
 * Fallback interativo — só na primeira integração quando ROPC HTTP falha
 * (ex.: conta só com OTP CPF+data de nascimento).
 */
export async function loginHermesPardiniViaBrowser(
  page: Page,
  login: string,
  password: string,
): Promise<CapturedOidcTokens> {
  const capture = attachHermesPardiniTokenCapture(page)
  await openHermesPardiniPortalLogin(page)
  await fillHermesPardiniPasswordForm(page, login, password)
  await submitHermesPardiniPasswordForm(page)
  return capture.waitForTokens()
}

/** Heurística: ainda na página de login Keycloak. */
export async function isHermesPardiniLoginPage(page: Page): Promise<boolean> {
  const url = page.url()
  if (/openid-connect\/auth/i.test(url)) return true
  if (/customer\/account\/login/i.test(url)) return true
  return false
}
