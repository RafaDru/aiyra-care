import type { Page } from '@playwright/test'
import { acceptComplianceIfPresent } from './compliance'

/** Garante sessão Supabase hidratada antes de chamadas autenticadas (ex.: Ava SSE). */
export async function waitForSupabaseSession(page: Page, timeout = 45_000) {
  await page.waitForFunction(
    () => {
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i)
        if (!key || !key.includes('auth-token')) continue
        const raw = localStorage.getItem(key)
        if (!raw) continue
        try {
          const parsed = JSON.parse(raw) as { access_token?: string }
          if (parsed.access_token) return true
        } catch {
          continue
        }
      }
      return false
    },
    { timeout },
  )
}

export async function loginViaPassword(page: Page, email: string, password: string) {
  const timeout = process.env.CI ? 40_000 : 25_000

  await page.goto('/login')
  await page.getByLabel('E-mail').fill(email)
  await page.getByLabel('Senha').fill(password)
  await page.getByRole('button', { name: 'Entrar' }).click()

  try {
    await page.waitForURL((url) => !url.pathname.includes('/login'), { timeout })
  } catch {
    const alertText = await page.locator('.ant-alert-error').first().textContent().catch(() => '')
    throw new Error(
      `Login não saiu de /login (${email}). Alerta: ${alertText?.trim() || '(nenhum)'}`,
    )
  }

  await acceptComplianceIfPresent(page)
}
