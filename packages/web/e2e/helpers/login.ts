import type { Page } from '@playwright/test'
import { config } from 'dotenv'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const webRoot = resolve(dirname(fileURLToPath(import.meta.url)), '../..')
config({ path: resolve(webRoot, '.env.e2e.local') })
config({ path: resolve(webRoot, '.env.local') })

function requireEnv(name: string): string {
  const v = process.env[name]?.trim()
  if (!v) {
    throw new Error(
      `Missing ${name} — copy packages/web/.env.e2e.example to .env.e2e.local (see docs/testing/AUTH_TESTING.md)`,
    )
  }
  return v
}

/**
 * Login via e-mail/senha na UI — sem OAuth social.
 */
export async function loginViaPassword(page: Page, opts?: { email?: string; password?: string }) {
  const email = opts?.email ?? requireEnv('QA_TEST_EMAIL')
  const password = opts?.password ?? requireEnv('QA_TEST_PASSWORD')

  await page.goto('/login')
  await page.getByLabel(/e-mail|email/i).fill(email)
  await page.getByLabel(/senha|password/i).fill(password)
  await page.getByRole('button', { name: /entrar|sign in/i }).click()

  await page.waitForURL((url) => !url.pathname.includes('/login'), { timeout: 30_000 })
}
